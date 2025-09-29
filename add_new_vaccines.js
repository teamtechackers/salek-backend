import { query } from './src/config/database.js';
import { VACCINES_TABLE, VACCINES_FIELDS } from './src/models/vaccines_model.js';
import logger from './src/config/logger.js';

const newVaccines = [
  {
    vaccine_id: 46,
    name: "Dengue Vaccine",
    type: "Optional",
    category: "Child",
    sub_category: "Optional",
    min_age_months: 72,
    max_age_months: 216,
    total_doses: 3,
    frequency: "Three doses",
    when_to_give: "First dose at 9 years, second after 6 months, third after 6 months",
    dose: "0.5 ml",
    route: "Subcutaneous",
    site: "Upper Arm",
    notes: "Protects against dengue fever in endemic areas"
  },
  {
    vaccine_id: 47,
    name: "Meningitis B",
    type: "Optional",
    category: "Child",
    sub_category: "Optional",
    min_age_months: 60,
    max_age_months: 1200,
    total_doses: 2,
    frequency: "Two doses",
    when_to_give: "First dose at 5 years, second dose after 2 months",
    dose: "0.5 ml",
    route: "Intramuscular",
    site: "Deltoid",
    notes: "Protects against Meningitis B infection"
  },
  {
    vaccine_id: 48,
    name: "Hepatitis E",
    type: "High-risk",
    category: "Adult",
    sub_category: "Optional",
    min_age_months: 216,
    max_age_months: 1200,
    total_doses: 3,
    frequency: "Three doses",
    when_to_give: "0, 1, and 6 months schedule",
    dose: "0.5 ml",
    route: "Intramuscular",
    site: "Deltoid",
    notes: "Recommended for pregnant women and high-risk adults"
  },
  {
    vaccine_id: 49,
    name: "Tick-borne Encephalitis",
    type: "Travel",
    category: "Travel",
    sub_category: "Optional",
    min_age_months: 36,
    max_age_months: 1200,
    total_doses: 3,
    frequency: "Primary series + booster",
    when_to_give: "0, 1-3 months, and 9-12 months, booster every 3-5 years",
    dose: "0.5 ml",
    route: "Intramuscular",
    site: "Deltoid",
    notes: "Required for travel to endemic areas in Europe and Asia"
  },
  {
    vaccine_id: 50,
    name: "Japanese Encephalitis (Adult)",
    type: "Travel",
    category: "Travel",
    sub_category: "Optional",
    min_age_months: 216,
    max_age_months: 1200,
    total_doses: 2,
    frequency: "Two doses",
    when_to_give: "First dose, second dose after 28 days",
    dose: "0.5 ml",
    route: "Intramuscular",
    site: "Deltoid",
    notes: "Required for travel to endemic areas in Asia"
  }
];

async function addNewVaccines() {
  try {
    for (const vaccine of newVaccines) {
      // Check if vaccine already exists
      const existingVaccine = await query(
        `SELECT vaccine_id FROM ${VACCINES_TABLE} WHERE vaccine_id = ?`,
        [vaccine.vaccine_id]
      );

      if (existingVaccine.length > 0) {
        logger.info(`Vaccine ${vaccine.name} (ID: ${vaccine.vaccine_id}) already exists, skipping...`);
        continue;
      }

      const sql = `
        INSERT INTO ${VACCINES_TABLE} (
          ${VACCINES_FIELDS.VACCINE_ID},
          ${VACCINES_FIELDS.NAME},
          ${VACCINES_FIELDS.TYPE},
          ${VACCINES_FIELDS.CATEGORY},
          ${VACCINES_FIELDS.SUB_CATEGORY},
          ${VACCINES_FIELDS.MIN_AGE_MONTHS},
          ${VACCINES_FIELDS.MAX_AGE_MONTHS},
          ${VACCINES_FIELDS.TOTAL_DOSES},
          ${VACCINES_FIELDS.FREQUENCY},
          ${VACCINES_FIELDS.WHEN_TO_GIVE},
          ${VACCINES_FIELDS.DOSE},
          ${VACCINES_FIELDS.ROUTE},
          ${VACCINES_FIELDS.SITE},
          ${VACCINES_FIELDS.NOTES}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        vaccine.vaccine_id,
        vaccine.name,
        vaccine.type,
        vaccine.category,
        vaccine.sub_category,
        vaccine.min_age_months,
        vaccine.max_age_months,
        vaccine.total_doses,
        vaccine.frequency,
        vaccine.when_to_give,
        vaccine.dose,
        vaccine.route,
        vaccine.site,
        vaccine.notes
      ];

      await query(sql, params);
      logger.info(`✅ Added vaccine: ${vaccine.name} (ID: ${vaccine.vaccine_id})`);
    }

    logger.info(`🎉 Successfully added ${newVaccines.length} new vaccines!`);
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error adding new vaccines:', error);
    process.exit(1);
  }
}

addNewVaccines();
