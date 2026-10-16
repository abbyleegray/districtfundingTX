# ============================================================
# Texas district spending trends by size band
# Replicates the Claude analysis and gives you room to extend it.
# Requires: readxl, dplyr, tidyr, ggplot2  (install.packages(c("readxl","dplyr","tidyr","ggplot2")))
# ============================================================

library(readxl)
library(dplyr)
library(tidyr)
library(ggplot2)

FILE <- "actual2025-info-gen-all.xlsx"  # update path if needed

enroll <- read_excel(FILE, sheet = "24_25 Enroll Act") %>%
  select(dnum = `DISTRICT NUMBER`, enr = ENROLLMENT) %>%
  filter(!is.na(enr), enr > 0)

gf <- read_excel(FILE, sheet = "24_25 GF Act")

# Function Code columns of interest -> short names
func_map <- c(
  "GF Instruction (Function 11,95)"                               = "Instruction_11",
  "GF Instructional Resources & Media Services (Function 12)"     = "Media_12",
  "GF Curriculum & Staff Development (Function 13)"               = "CurricDev_13",
  "GF Instructional Leadership (Function 21)"                     = "InstrLead_21",
  "GF School Leadership (Function 23)"                            = "SchoolLead_23",
  "GF Guidance Counseling Services (Function 31)"                 = "Guidance_31",
  "GF Social Work Services (Function 32)"                         = "SocialWork_32",
  "GF Health Services (Function 33)"                              = "Health_33",
  "GF Transportation (Function 34)"                                = "Transport_34",
  "GF Extracurricular (Function 36)"                              = "Extracurr_36",
  "GF General Administration (Function 41,92)"                    = "GenAdmin_41",
  "GF Facilities Maintenance & Operations (Function 51)"          = "Facilities_51",
  "GF Security & Monitoring Services (Function 52)"               = "Security_52",
  "GF Data Processing Services (Function 53)"                     = "DataProc_53",
  "GF Community Services (Function 61)"                           = "CommunitySvc_61"
)


df <- gf %>%
  filter(!grepl("CHARTER", `District Type`, ignore.case = TRUE)) %>%
  select(dnum = `DISTRICT NUMBER`, `District Type`, all_of(names(func_map)))

names(df) <- ifelse(names(df) %in% names(func_map), func_map[names(df)], names(df))

df <- df %>% inner_join(enroll, by = "dnum")

# --- Size bands (matches your app's existing thresholds, plus finer splits above 5,000) ---
df <- df %>%
  mutate(band = case_when(
    enr < 500  ~ "A: <500",
    enr < 1000  ~ "B: 500-1,000",
    enr < 2000  ~ "C: 1,000-2,000",
    enr < 4000 ~ "D: 2,000-4,000",
    enr < 6000 ~ "E: 4,000-6,000",
    enr < 8000 ~ "F: 6,000-8,000",
    enr < 10000 ~ "G: 8,000-10,000",
    enr < 15000 ~ "H: 10,000-15,000",
    enr < 20000 ~ "I: 15,000-20,000",
    enr < 25000 ~ "J: 20,000-25,000",
    TRUE        ~ " : 25,000+"
  ))

long <- df %>%
  pivot_longer(cols = all_of(unname(func_map)), names_to = "func", values_to = "spend") %>%
  filter(spend > 0) %>%                 # drop true zeros - likely "not tracked separately," not real zero cost
  mutate(per_pupil = spend / enr)

# --- The core table: mean, median, SD, CV per function per band ---
summary_tbl <- long %>%
  group_by(func, band) %>%
  summarise(
    n = n(),
    mean_pp = mean(per_pupil),
    median_pp = median(per_pupil),
    sd_pp = sd(per_pupil),
    cv = sd_pp / mean_pp,
    .groups = "drop"
  ) %>%
  arrange(func, band)

print(summary_tbl, n = Inf)
write.csv(summary_tbl, "spending_trend_summary.csv", row.names = FALSE)

# --- Flag categories/bands where CV is too high for a confident single default ---
# (0.3 is a reasonable starting cutoff to try - adjust and re-run to see how the flagged set changes)
flagged <- summary_tbl %>% filter(cv > 0.3) %>% arrange(desc(cv))
cat("\n--- Flagged as too noisy for a confident auto-fill default (CV > 0.3) ---\n")
print(flagged, n = Inf)

# --- Extension 1: does spending-per-pupil decay like a 1/enrollment fixed-cost curve? ---
# Worth checking for General Admin and Curriculum Dev specifically, where the smallest band's
# CV was especially extreme - a clean 1/enrollment fit would be strong evidence of a fixed-cost effect.
fit_check <- function(fname) {
  sub <- long %>% filter(func == fname)
  model <- lm(per_pupil ~ I(1/enr), data = sub)
  cat("\n---", fname, "---\n")
  print(summary(model)$r.squared)
  model
}
# Example:
# fit_check("GenAdmin_41")

# --- Extension 2: continuous view instead of discrete bands ---
# A scatter + smoothed trend line often shows the decay curve more honestly than bucketed means,
# especially for the small-district end where a handful of extreme districts drive the bucket average.
plot_trend <- function(fname) {
  sub <- long %>% filter(func == fname, enr < 30000)  # cap x-axis for readability; drop filter to see full range
  ggplot(sub, aes(x = enr, y = per_pupil)) +
    geom_point(alpha = 0.3) +
    geom_smooth(method = "loess", se = TRUE) +
    labs(title = fname, x = "Enrollment", y = "$ per pupil") +
    theme_minimal()
}
# Example:
# plot_trend("GenAdmin_41")
# ggsave("genadmin_trend.png", width=8, height=5)

# --- Extension 3: break down by Program Intent Code instead of Function Code ---
# Same approach, just read the "GF ... (PIC ##)" columns instead of the Function columns above -
# useful since PIC is what connects spending back to your revenue-side variables directly.

# ============================================================
# Texas district staffing (FTE + salary) trends by size band
# Sibling script to analyze_spending_trends.R - same bands, same
# CV/outlier methodology, so the two are directly comparable.
# Requires: readxl, dplyr, tidyr, ggplot2
# ============================================================

library(readxl)
library(dplyr)
library(tidyr)
library(tibble)
library(ggplot2)

STAFF_FILE <- "Staff Salary FTE Report_Statewide_Districts_2024-2025.xlsx"
ENROLL_FILE <- "actual2025-info-gen-all.xlsx"   # reuse enrollment from the spending workbook - same year, same source
 
# ---------- Enrollment (same as the spending script) ----------
enroll_raw <- read_excel(ENROLL_FILE, sheet = "24_25 Enroll Act")
names(enroll_raw) <- trimws(names(enroll_raw))
enroll <- enroll_raw %>%
  select(dnum = `DISTRICT NUMBER`, enr = ENROLLMENT) %>%
  filter(!is.na(enr), enr > 0)
 
# ---------- Staff file ----------
staff <- read_excel(STAFF_FILE, sheet = "Staff Salary FTE Report_Statewi")
 
# Normalize column names immediately - the source file's "Charter Status" column has
# inconsistent leading/trailing whitespace depending on how it's read (readxl vs. other
# tools disagree on this), so trim every column name once here rather than hardcoding
# a literal space character that may not match. Run names(staff) yourself if anything
# downstream still complains about a column not existing - that'll show you the exact
# current names to reference.
names(staff) <- trimws(names(staff))
 
# ---------- Role -> Function Code mapping ----------
# Deliberately explicit, one role per line, so you can see and adjust every call.
# Rows with Staff %in% c("TOTAL ADMINISTRATIVE STAFF","TOTAL AUXILIARY STAFF",
# "TOTAL PARAPROFESSIONAL STAFF","TOTAL PERSONNEL","TOTAL PROFESSIONAL STAFF",
# "TOTAL SUPPORT STAFF") are category ROLLUPS spanning multiple functions - never
# map those directly, since their components are already captured individually below.
# TOTAL TEACHING STAFF is the one exception: used as the single clean Function-11
# teaching figure instead of summing grade-level rows, since districts report grade
# breakdowns inconsistently (some by individual grade, some by band, some lumped as
# "ALL GRADE LEVELS") and summing them risks double-counting or under-counting
# depending on how a given district happened to report that year.
 
role_to_func <- tribble(
  ~Staff,                              ~func,
  "TOTAL TEACHING STAFF",              "Instruction_11",
  "EDUCATIONAL AIDE",                  "Instruction_11",   # paraprofessional classroom support
  "LIBRARIAN",                         "Media_12",
  "INSTRUCT MATERIALS COORDINATOR",    "Media_12",
  "INSTRUCTIONAL COACH",               "InstrLead_21",
  "TEACHER FACILITATOR",               "InstrLead_21",
  "TEACHER SUPERVISOR",                "InstrLead_21",
  "DIST INSTR PGM DIR OR EXC DIR",     "InstrLead_21",
  "TEACHER APPRAISER",                 "InstrLead_21",
  "PRINCIPAL",                         "SchoolLead_23",
  "ASSISTANT PRINCIPAL",               "SchoolLead_23",
  "SCHOOL COUNSELOR",                  "Guidance_31",
  "LICENSD PROFESSIONAL COUNSELOR",    "Guidance_31",
  "EDUCATIONAL DIAGNOSTICIAN",         "Guidance_31",
  "LSSP/PSYCHOLOGIST",                 "Guidance_31",
  "PSYCHOLOGICAL ASSOCIATE",           "Guidance_31",
  "SOCIAL WORKER",                     "SocialWork_32",
  "LICENSED CLINICAL SOCIAL WRKER",    "SocialWork_32",
  "LICN MARRIAGE&FAMILY THERAPIST",    "SocialWork_32",
  "FAMILY AND COMMUNITY LIAISON",      "SocialWork_32",
  "SCHOOL NURSE",                      "Health_33",
  "PHYSICIAN",                         "Health_33",
  "OCCUPATIONAL THERAPIST",            "Health_33",   # caveat: may be SpEd-related-service in practice
  "PHYSICAL THERAPIST",                "Health_33",   # caveat: may be SpEd-related-service in practice
  "ATHLETIC TRAINER",                  "Health_33",
  "SPEECH THRPST/SPEECH-LANG PATH",    "Health_33",   # caveat: may be SpEd-related-service in practice
  "AUDIOLOGIST",                       "Health_33",
  "ART THERAPIST",                     "Health_33",
  "MUSIC THERAPIST",                   "Health_33",
  "RECREATIONAL THERAPIST",            "Health_33",
  "CORRECTIVE THERAPIST",              "Health_33",
  "ORIENTATN/MOBILITY SPEC (COMS)",    "Health_33",
  "TRANSPORTATION",                    "Transport_34",
  "ATHLETIC DIRECTOR",                 "Extracurr_36",
  "ATHLETICS - OTHR THAN ATHL DIR",    "Extracurr_36",
  "SUPERINTENDENT/CAO/CEO/PRESDNT",    "GenAdmin_41",
  "ASST/ASSOC/DEPUTY SUPERINTEND.",    "GenAdmin_41",
  "BUSINESS MANAGER",                  "GenAdmin_41",
  "BUSINESS SERVICES PROFESSIONAL",    "GenAdmin_41",
  "BUSNESS/FINANCE CLERICAL",          "GenAdmin_41",
  "CENTRAL OFFICE/CLERICAL",           "GenAdmin_41",
  "DIR -PERSONNEL/HUMAN RESOURCES",    "GenAdmin_41",
  "HUMAN RESOURCES (CRT-HR SPECIA",    "GenAdmin_41",
  "COMMUNICATIONS PROFESSIONAL",       "GenAdmin_41",
  "LEGAL SERVICES",                    "GenAdmin_41",
  "INTERNAL AUDITOR",                  "GenAdmin_41",
  "TAX ASSESSOR AND/OR COLLECTOR",     "GenAdmin_41",
  "EXECUTIVE DIRECTOR",                "GenAdmin_41",
  "REGISTRAR",                         "GenAdmin_41",
  "CUSTODIAL-SRV IN PROF/MGT ROLE",    "Facilities_51",
  "CUSTODIAL-STAFF SRV IN AUX/SPT",    "Facilities_51",
  "MAINTENANCE-SRV IN PRF/MGT RLE",    "Facilities_51",
  "MAINTENANCE-STF SRV IN AUX/SPT",    "Facilities_51",
  "ELECTRICIAN",                       "Facilities_51",
  "HVAC",                              "Facilities_51",
  "PLUMBER",                           "Facilities_51",
  "PAINTER",                           "Facilities_51",
  "WAREHOUSE",                         "Facilities_51",
  "SAFETY/SECURITY",                   "Security_52",
  "SECURITY",                          "Security_52",
  "INFORMATION TECHNOLOGY TECHNIC",    "DataProc_53",
  "LEA/CMP INFO TECH PROFESSIONAL",    "DataProc_53",
  "CAMPUS TECHNOLOGY SPECIALIST",      "DataProc_53",
  "CHILD NUTRITION",                   "FoodService_35",
  "FOOD SERVICE PROFESSIONAL",         "FoodService_35"
  # Deliberately left unmapped (ambiguous, spans multiple functions, or too rare
  # to be worth a judgment call): COORDINATOR/MANAGER/SUPERVISOR, SPECIALIST/CONSULTANT,
  # DEPARTMENT HEAD, CHAPLAIN, CERTIFIED INTERPRETER, CHARTER PARTNER,
  # TRUANT OFF/VISIT TEACHER, WORK-BASED LEARNING SITE COOR, OTH/OTHR *EXEMPT* rows.
  # These fall into "Unmapped" below so you can see how much FTE/pay they represent
  # before deciding whether any are worth adding above.
)
 
# ---------- Build district x function aggregates ----------
staff_clean <- staff %>%
  rename(dnum = District, charter = `Charter Status`) %>%   # now safe - names(staff) was trimmed above
  select(dnum, `District Name`, charter, Staff_Category, Staff, `FTE Count`, `Total Base Pay`) %>%
  filter(!is.na(dnum)) %>%
  # CRITICAL: this file's district numbers are plain integers (e.g. 57829), but the
  # enrollment file's are zero-padded 6-digit strings (e.g. "001902"). Texas district
  # numbers are 3-digit county + 3-digit sequence, so every county below 100 would
  # silently fail to join without this - and Austin ISD (227901) wouldn't have
  # revealed the problem, since it doesn't need padding. Force both sides to the
  # same zero-padded string format before joining, not just a type coercion.
  mutate(dnum = sprintf("%06d", as.numeric(dnum)))
 
enroll <- enroll %>%
  mutate(dnum = sprintf("%06d", as.numeric(dnum)))   # re-pad defensively in case readxl parsed this one as numeric too
 
by_func <- staff_clean %>%
  inner_join(role_to_func, by = "Staff") %>%
  # Group by District Name alongside dnum - each dnum maps to exactly one name, so this
  # doesn't change the aggregation at all, it just stops summarise() from silently
  # dropping the column (summarise keeps only grouped + aggregated columns - everything
  # else gets discarded here even though the error about it won't surface until much
  # later in the script, at whatever point first tries to use District Name again).
  group_by(dnum, `District Name`, func) %>%
  summarise(
    fte = sum(`FTE Count`, na.rm = TRUE),
    total_pay = sum(`Total Base Pay`, na.rm = TRUE),
    .groups = "drop"
  )
 
# ---------- What got left unmapped (inspect before trusting the totals above) ----------
unmapped <- staff_clean %>%
  filter(!(Staff %in% role_to_func$Staff)) %>%
  filter(!grepl("^TOTAL ", Staff)) %>%   # the category rollups are *supposed* to be excluded - don't flag those
  group_by(Staff) %>%
  summarise(total_fte = sum(`FTE Count`, na.rm = TRUE), .groups = "drop") %>%
  arrange(desc(total_fte))
View(unmapped)  # if any of these represent real FTE, decide whether to add them to role_to_func above
 
# ---------- Join enrollment, band, and compute per-pupil + weighted avg salary ----------
df <- by_func %>%
  inner_join(enroll, by = "dnum") %>%
  mutate(
    fte_per_1000 = fte / enr * 1000,
    pay_per_pupil = total_pay / enr,
    avg_salary = total_pay / fte,        # weighted by FTE - correct way to average an average
    band = case_when(
      enr < 500   ~ "A: <500",
      enr < 1000  ~ "B: 500-1,000",
      enr < 2000  ~ "C: 1,000-2,000",
      enr < 4000  ~ "D: 2,000-4,000",
      enr < 6000  ~ "E: 4,000-6,000",
      enr < 8000  ~ "F: 6,000-8,000",
      enr < 10000 ~ "G: 8,000-10,000",
      enr < 15000 ~ "H: 10,000-15,000",
      enr < 20000 ~ "I: 15,000-20,000",
      enr < 25000 ~ "J: 20,000-25,000",
      TRUE        ~ "K: 25,000+"
    )
  ) %>%
  filter(fte > 0)   # drop true zeros - a function with 0 FTE that year, not a data point to average
 
# ---------- Core summary table: FTE-per-1,000, $/pupil, and weighted avg salary, by band ----------
staffing_summary <- df %>%
  group_by(func, band) %>%
  summarise(
    n = n(),
    mean_fte_per_1000 = mean(fte_per_1000),
    cv_fte_per_1000 = sd(fte_per_1000) / mean(fte_per_1000),
    mean_pay_per_pupil = mean(pay_per_pupil),
    cv_pay_per_pupil = sd(pay_per_pupil) / mean(pay_per_pupil),
    mean_avg_salary = mean(avg_salary),
    median_avg_salary = median(avg_salary),
    cv_avg_salary = sd(avg_salary) / mean(avg_salary),
    .groups = "drop"
  ) %>%
  arrange(func, band)
 
print(staffing_summary, n = Inf)
write.csv(staffing_summary, "staffing_trend_summary.csv", row.names = FALSE)
 
# ---------- Does staffing LEVEL show the same fixed-cost dilution as dollars did? ----------
# A natural parallel test to the spending regression: is FTE-per-1,000-students itself
# roughly constant (as you'd expect for e.g. Instruction, which scales with enrollment),
# or does it also decay like 1/enrollment (as you'd expect for Admin/GenAdmin, where a
# small district needs close to the same single superintendent/business office regardless
# of size)? This tells you whether the dollar-cost curve from the spending script is being
# driven by STAFFING LEVELS changing with size, or by SALARY LEVELS changing with size, or both.
fit_staffing <- function(fname) {
  sub <- df %>% filter(func == fname)
  model <- lm(fte_per_1000 ~ I(1/enr), data = sub)
  cat("\n---", fname, "(FTE per 1,000 vs 1/enrollment) ---\n")
  print(summary(model)$r.squared)
  model
}
# Example:
# fit_staffing("GenAdmin_41")
 
# ---------- Outlier inspection, same approach as the spending script ----------
# Same caution applies: in the smallest band, an extreme FTE-per-1,000 figure for
# General Admin might be the real fixed-staffing phenomenon, not bad data.
flag_outliers <- function(x) {
  q1 <- quantile(x, 0.25, na.rm = TRUE); q3 <- quantile(x, 0.75, na.rm = TRUE)
  iqr <- q3 - q1
  x < (q1 - 1.5 * iqr) | x > (q3 + 1.5 * iqr)
}
staffing_flagged <- df %>%
  group_by(func, band) %>%
  mutate(is_outlier_fte = flag_outliers(fte_per_1000), is_outlier_salary = flag_outliers(avg_salary)) %>%
  ungroup()
 
outlier_review_staffing <- staffing_flagged %>%
  filter(is_outlier_fte | is_outlier_salary) %>%
  select(`District Name`, dnum, func, band, enr, fte_per_1000, avg_salary, is_outlier_fte, is_outlier_salary) %>%
  arrange(func, band, desc(fte_per_1000))
View(outlier_review_staffing)
 