/* Real station codes and coordinates ([lon, lat], GeoJSON order — getting this
   backwards produces a map of the Indian Ocean). A 20-station stand-in for the
   generated 8,696-station file, which is gitignored in the source repo. */
window.PF_STATIONS = [
  { code: 'HWH',  name: 'Howrah Jn',          state: 'West Bengal',    lonlat: [88.34, 22.58] },
  { code: 'NJP',  name: 'New Jalpaiguri',     state: 'West Bengal',    lonlat: [88.43, 26.68] },
  { code: 'TATA', name: 'Tatanagar Jn',       state: 'Jharkhand',      lonlat: [86.20, 22.80] },
  { code: 'BSP',  name: 'Bilaspur Jn',        state: 'Chhattisgarh',   lonlat: [82.14, 22.08] },
  { code: 'NGP',  name: 'Nagpur',             state: 'Maharashtra',    lonlat: [79.09, 21.15] },
  { code: 'BZA',  name: 'Vijayawada Jn',      state: 'Andhra Pradesh', lonlat: [80.62, 16.51] },
  { code: 'MAS',  name: 'MGR Chennai Ctl',    state: 'Tamil Nadu',     lonlat: [80.27, 13.08] },
  { code: 'KPD',  name: 'Katpadi Jn',         state: 'Tamil Nadu',     lonlat: [79.14, 12.97] },
  { code: 'NDLS', name: 'New Delhi',          state: 'Delhi',          lonlat: [77.22, 28.64] },
  { code: 'CSMT', name: 'Mumbai CSMT',        state: 'Maharashtra',    lonlat: [72.84, 18.94] },
  { code: 'SBC',  name: 'KSR Bengaluru',      state: 'Karnataka',      lonlat: [77.57, 12.98] },
  { code: 'ADI',  name: 'Ahmedabad Jn',       state: 'Gujarat',        lonlat: [72.60, 23.03] },
  { code: 'JP',   name: 'Jaipur Jn',          state: 'Rajasthan',      lonlat: [75.79, 26.92] },
  { code: 'PNBE', name: 'Patna Jn',           state: 'Bihar',          lonlat: [85.14, 25.60] },
  { code: 'TVC',  name: 'Thiruvananthapuram', state: 'Kerala',         lonlat: [76.95,  8.49] },
  { code: 'GHY',  name: 'Guwahati',           state: 'Assam',          lonlat: [91.75, 26.18] },
  { code: 'BBS',  name: 'Bhubaneswar',        state: 'Odisha',         lonlat: [85.84, 20.27] },
  { code: 'LKO',  name: 'Lucknow',            state: 'Uttar Pradesh',  lonlat: [80.94, 26.83] },
  { code: 'JU',   name: 'Jodhpur Jn',         state: 'Rajasthan',      lonlat: [73.02, 26.29] },
  { code: 'CBE',  name: 'Coimbatore Jn',      state: 'Tamil Nadu',     lonlat: [76.96, 11.00] },
];

/* The sample journeys, verbatim from src/features/journeys/sampleJourneys.ts.
   Real journeys with real codes — plausible fake data hides real problems. */
window.PF_SAMPLE_JOURNEYS = [
  { id: 's1', fromCode: 'HWH',  toCode: 'TATA', travelledOn: '2025-11-14', trainNumber: '12860', note: null },
  { id: 's2', fromCode: 'TATA', toCode: 'BSP',  travelledOn: '2025-11-15', trainNumber: '12860', note: null },
  { id: 's3', fromCode: 'BSP',  toCode: 'NGP',  travelledOn: '2025-11-15', trainNumber: '12860', note: null },
  { id: 's4', fromCode: 'NGP',  toCode: 'BZA',  travelledOn: '2026-02-02', trainNumber: null,    note: 'Overnight, top bunk.' },
  { id: 's5', fromCode: 'BZA',  toCode: 'MAS',  travelledOn: '2026-02-03', trainNumber: '12839', note: null },
  { id: 's6', fromCode: 'MAS',  toCode: 'KPD',  travelledOn: '2026-02-03', trainNumber: '12007', note: 'Checkup. Ma met me at the station.' },
  { id: 's7', fromCode: 'HWH',  toCode: 'NJP',  travelledOn: '2026-04-11', trainNumber: '12343', note: null },
];

window.PF_TRAINS = [
  { number: '12860', name: 'Gitanjali Express', stops: 23 },
  { number: '12839', name: 'Howrah Mail',       stops: 31 },
  { number: '12007', name: 'Shatabdi Express',  stops: 6  },
];
