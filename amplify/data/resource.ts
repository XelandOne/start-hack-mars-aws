import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Crops available for the greenhouse
  Crop: a.model({
    name: a.string().required(),
    type: a.enum(['LETTUCE', 'POTATO', 'RADISH', 'BEAN', 'PEA', 'HERB']),
    status: a.enum(['PLANNED', 'GROWING', 'HARVESTED', 'FAILED']),
    plantedDay: a.integer(),       // mission day planted (1-450)
    harvestDay: a.integer(),       // expected harvest day
    zone: a.string(),              // greenhouse zone (A, B, C...)
    notes: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // Environmental sensor readings
  SensorReading: a.model({
    timestamp: a.datetime().required(),
    zone: a.string().required(),
    temperature: a.float(),        // °C
    humidity: a.float(),           // %
    co2Level: a.float(),           // ppm
    lightLevel: a.float(),         // lux
    waterLevel: a.float(),         // liters
    soilMoisture: a.float(),       // %
  }).authorization(allow => [allow.publicApiKey()]),

  // AI agent recommendations / alerts
  AgentRecommendation: a.model({
    missionDay: a.integer().required(),
    type: a.enum(['CROP_SELECTION', 'WATERING', 'NUTRIENT', 'ALERT', 'HARVEST']),
    severity: a.enum(['INFO', 'WARNING', 'CRITICAL']),
    title: a.string().required(),
    message: a.string().required(),
    actionTaken: a.boolean(),
  }).authorization(allow => [allow.publicApiKey()]),

  // Mission timeline state
  MissionState: a.model({
    currentDay: a.integer().required(),
    totalDays: a.integer().required(),
    phase: a.enum(['SETUP', 'EARLY_GROWTH', 'PEAK_PRODUCTION', 'LATE_MISSION']),
    crewSize: a.integer(),
    totalCaloriesProduced: a.float(),
    waterUsedLiters: a.float(),
    powerUsedKwh: a.float(),
  }).authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
