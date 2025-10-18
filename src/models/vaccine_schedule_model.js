export const VACCINE_SCHEDULE_TABLE = 'vaccine_schedule';

export const VACCINE_SCHEDULE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${VACCINE_SCHEDULE_TABLE} (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    vaccine_id INT NOT NULL,
    min_age_days INT NOT NULL,
    max_age_days INT NULL,
    interval_days INT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    country_id INT NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (vaccine_id) REFERENCES vaccines(vaccine_id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(country_id) ON DELETE CASCADE,
    INDEX idx_vaccine_country (vaccine_id, country_id),
    INDEX idx_age_range (min_age_days, max_age_days),
    INDEX idx_mandatory (is_mandatory)
  )
`;

export const VACCINE_SCHEDULE_FIELDS = {
  SCHEDULE_ID: 'schedule_id',
  VACCINE_ID: 'vaccine_id',
  MIN_AGE_DAYS: 'min_age_days',
  MAX_AGE_DAYS: 'max_age_days',
  INTERVAL_DAYS: 'interval_days',
  IS_MANDATORY: 'is_mandatory',
  COUNTRY_ID: 'country_id',
  NOTES: 'notes',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  IS_ACTIVE: 'is_active'
};

// Document-based vaccine schedule data with exact days
export const VACCINE_SCHEDULE_DATA = [
  // PRENATAL VACCINES (negative days = before birth)
  {
    schedule_id: 1,
    vaccine_id: 1, // TT-1
    min_age_days: -270, // 9 months before birth
    max_age_days: -180, // 6 months before birth
    interval_days: null,
    is_mandatory: true,
    country_id: 1, // All
    notes: 'Early in pregnancy'
  },
  {
    schedule_id: 2,
    vaccine_id: 2, // TT-2
    min_age_days: -240, // 8 months before birth
    max_age_days: -120, // 4 months before birth
    interval_days: 28, // 4 weeks after TT-1
    is_mandatory: true,
    country_id: 1,
    notes: '4 weeks after TT-1'
  },
  {
    schedule_id: 3,
    vaccine_id: 3, // TT-Booster
    min_age_days: -90, // 3 months before birth
    max_age_days: 0,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'If 2 TT doses in last 3 years'
  },
  {
    schedule_id: 4,
    vaccine_id: 4, // Influenza Prenatal
    min_age_days: -270,
    max_age_days: 0,
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'Any trimester'
  },

  // BIRTH TO 1 YEAR (0-365 days)
  {
    schedule_id: 5,
    vaccine_id: 5, // BCG
    min_age_days: 0,
    max_age_days: 30,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'At birth or as early as possible'
  },
  {
    schedule_id: 6,
    vaccine_id: 6, // OPV-0
    min_age_days: 0,
    max_age_days: 15,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'Within 15 days of birth'
  },
  {
    schedule_id: 7,
    vaccine_id: 7, // OPV-1
    min_age_days: 42, // 6 weeks
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 8,
    vaccine_id: 7, // OPV-2
    min_age_days: 70, // 10 weeks
    max_age_days: 77,
    interval_days: 28, // 4 weeks after OPV-1
    is_mandatory: true,
    country_id: 1,
    notes: 'Second dose at 10 weeks'
  },
  {
    schedule_id: 9,
    vaccine_id: 7, // OPV-3
    min_age_days: 98, // 14 weeks
    max_age_days: 105,
    interval_days: 28, // 4 weeks after OPV-2
    is_mandatory: true,
    country_id: 1,
    notes: 'Third dose at 14 weeks'
  },
  {
    schedule_id: 10,
    vaccine_id: 8, // Pentavalent-1
    min_age_days: 42, // 6 weeks
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 11,
    vaccine_id: 8, // Pentavalent-2
    min_age_days: 70, // 10 weeks
    max_age_days: 77,
    interval_days: 28, // 4 weeks after Pentavalent-1
    is_mandatory: true,
    country_id: 1,
    notes: 'Second dose at 10 weeks'
  },
  {
    schedule_id: 12,
    vaccine_id: 8, // Pentavalent-3
    min_age_days: 98, // 14 weeks
    max_age_days: 105,
    interval_days: 28, // 4 weeks after Pentavalent-2
    is_mandatory: true,
    country_id: 1,
    notes: 'Third dose at 14 weeks'
  },
  {
    schedule_id: 13,
    vaccine_id: 9, // RVV-1
    min_age_days: 42, // 6 weeks
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 14,
    vaccine_id: 9, // RVV-2
    min_age_days: 70, // 10 weeks
    max_age_days: 77,
    interval_days: 28, // 4 weeks after RVV-1
    is_mandatory: true,
    country_id: 1,
    notes: 'Second dose at 10 weeks'
  },
  {
    schedule_id: 15,
    vaccine_id: 9, // RVV-3
    min_age_days: 98, // 14 weeks
    max_age_days: 105,
    interval_days: 28, // 4 weeks after RVV-2
    is_mandatory: true,
    country_id: 1,
    notes: 'Third dose at 14 weeks'
  },
  {
    schedule_id: 16,
    vaccine_id: 10, // fIPV-1
    min_age_days: 42, // 6 weeks
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 17,
    vaccine_id: 10, // fIPV-2
    min_age_days: 98, // 14 weeks
    max_age_days: 105,
    interval_days: 56, // 8 weeks after fIPV-1
    is_mandatory: true,
    country_id: 1,
    notes: 'Second dose at 14 weeks'
  },
  {
    schedule_id: 18,
    vaccine_id: 11, // PCV-1
    min_age_days: 42, // 6 weeks
    max_age_days: 49,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'First dose at 6 weeks'
  },
  {
    schedule_id: 19,
    vaccine_id: 11, // PCV-2
    min_age_days: 98, // 14 weeks
    max_age_days: 105,
    interval_days: 56, // 8 weeks after PCV-1
    is_mandatory: true,
    country_id: 1,
    notes: 'Second dose at 14 weeks'
  },
  {
    schedule_id: 20,
    vaccine_id: 12, // Measles/MR-1
    min_age_days: 270, // 9 months
    max_age_days: 365, // 12 months
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '9-12 months'
  },

  // 1-5 YEARS (366-1825 days)
  {
    schedule_id: 21,
    vaccine_id: 13, // DPT Booster-1
    min_age_days: 486, // 16 months
    max_age_days: 730, // 24 months
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '16-24 months'
  },
  {
    schedule_id: 22,
    vaccine_id: 14, // Measles/MR-2
    min_age_days: 486, // 16 months
    max_age_days: 730, // 24 months
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '16-24 months'
  },
  {
    schedule_id: 23,
    vaccine_id: 15, // OPV Booster
    min_age_days: 486, // 16 months
    max_age_days: 730, // 24 months
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '16-24 months'
  },
  {
    schedule_id: 24,
    vaccine_id: 16, // JE-2
    min_age_days: 486, // 16 months
    max_age_days: 730, // 24 months
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'In endemic areas'
  },
  {
    schedule_id: 25,
    vaccine_id: 17, // Vitamin A Dose 2
    min_age_days: 450, // 15 months
    max_age_days: 480,
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 26,
    vaccine_id: 17, // Vitamin A Dose 3
    min_age_days: 630, // 21 months
    max_age_days: 660,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 27,
    vaccine_id: 17, // Vitamin A Dose 4
    min_age_days: 810, // 27 months
    max_age_days: 840,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 28,
    vaccine_id: 17, // Vitamin A Dose 5
    min_age_days: 990, // 33 months
    max_age_days: 1020,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 29,
    vaccine_id: 17, // Vitamin A Dose 6
    min_age_days: 1170, // 39 months
    max_age_days: 1200,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 30,
    vaccine_id: 17, // Vitamin A Dose 7
    min_age_days: 1350, // 45 months
    max_age_days: 1380,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 31,
    vaccine_id: 17, // Vitamin A Dose 8
    min_age_days: 1530, // 51 months
    max_age_days: 1560,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 32,
    vaccine_id: 17, // Vitamin A Dose 9
    min_age_days: 1710, // 57 months
    max_age_days: 1740,
    interval_days: 180, // 6 months
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 6 months up to 5 years'
  },
  {
    schedule_id: 33,
    vaccine_id: 18, // DPT Booster-2
    min_age_days: 1825, // 5 years
    max_age_days: 2190, // 6 years
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '5-6 years'
  },
  {
    schedule_id: 34,
    vaccine_id: 19, // MMR (IAP)
    min_age_days: 450, // 15 months
    max_age_days: 540, // 18 months
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'IAP recommends'
  },

  // 6-18 YEARS (1826-6570 days)
  {
    schedule_id: 35,
    vaccine_id: 20, // Tdap/Td at 10 years
    min_age_days: 3650, // 10 years
    max_age_days: 4015, // 11 years
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '10 years'
  },
  {
    schedule_id: 36,
    vaccine_id: 20, // Tdap/Td at 16 years
    min_age_days: 5840, // 16 years
    max_age_days: 6205, // 17 years
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: '16 years'
  },
  {
    schedule_id: 37,
    vaccine_id: 21, // HPV first dose
    min_age_days: 3285, // 9 years
    max_age_days: 5110, // 14 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: '9-14 years (boys/girls)'
  },
  {
    schedule_id: 38,
    vaccine_id: 21, // HPV second dose
    min_age_days: 3465, // 9.5 years
    max_age_days: 5290, // 14.5 years
    interval_days: 180, // 6 months
    is_mandatory: false,
    country_id: 1,
    notes: '6 months after first dose'
  },
  {
    schedule_id: 39,
    vaccine_id: 22, // Typhoid booster
    min_age_days: 2190, // 6 years
    max_age_days: 1200, // 100 years
    interval_days: 1095, // 3 years
    is_mandatory: false,
    country_id: 1,
    notes: 'Booster every 3 years'
  },
  {
    schedule_id: 40,
    vaccine_id: 23, // Influenza annual
    min_age_days: 180, // 6 months
    max_age_days: 1200, // 100 years
    interval_days: 365, // 1 year
    is_mandatory: false,
    country_id: 1,
    notes: 'Annually'
  },

  // 18-60 YEARS (6571-21900 days)
  {
    schedule_id: 41,
    vaccine_id: 24, // Td/Tdap booster
    min_age_days: 6571, // 18 years
    max_age_days: 21900, // 60 years
    interval_days: 3650, // 10 years
    is_mandatory: true,
    country_id: 1,
    notes: 'Every 10 years'
  },
  {
    schedule_id: 42,
    vaccine_id: 25, // Influenza adult
    min_age_days: 6571, // 18 years
    max_age_days: 21900, // 60 years
    interval_days: 365, // 1 year
    is_mandatory: true,
    country_id: 1,
    notes: 'Annually'
  },
  {
    schedule_id: 43,
    vaccine_id: 26, // Pneumococcal adult
    min_age_days: 6935, // 19 years
    max_age_days: 23360, // 64 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'Once at 19-64 if high-risk'
  },
  {
    schedule_id: 44,
    vaccine_id: 27, // HPV adult
    min_age_days: 6571, // 18 years
    max_age_days: 13500, // 45 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'Up to 26 years (males), 45 years (females)'
  },

  // 60+ YEARS (21901+ days)
  {
    schedule_id: 45,
    vaccine_id: 28, // Influenza elderly
    min_age_days: 21901, // 60 years
    max_age_days: 36500, // 100 years
    interval_days: 365, // 1 year
    is_mandatory: true,
    country_id: 1,
    notes: 'Annually'
  },
  {
    schedule_id: 46,
    vaccine_id: 29, // Pneumococcal elderly
    min_age_days: 23725, // 65 years
    max_age_days: 36500, // 100 years
    interval_days: null,
    is_mandatory: true,
    country_id: 1,
    notes: 'Once at >65; booster if needed'
  },
  {
    schedule_id: 47,
    vaccine_id: 30, // Herpes Zoster
    min_age_days: 18250, // 50 years
    max_age_days: 36500, // 100 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'After 50 years'
  },

  // TRAVEL VACCINES
  {
    schedule_id: 48,
    vaccine_id: 31, // Yellow Fever
    min_age_days: 270, // 9 months
    max_age_days: 36500, // 100 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'At least 10 days before travel to endemic countries'
  },
  {
    schedule_id: 49,
    vaccine_id: 32, // Meningococcal
    min_age_days: 270, // 9 months
    max_age_days: 36500, // 100 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'At least 10 days before Hajj/Umrah'
  },
  {
    schedule_id: 50,
    vaccine_id: 33, // Polio travel
    min_age_days: 0,
    max_age_days: 36500, // 100 years
    interval_days: null,
    is_mandatory: false,
    country_id: 1,
    notes: 'Required for travel to/from countries with ongoing transmission'
  }
];