export const RULES_VERSION = '0.1.0';
export const rules = Object.freeze({ startDate: '2030-01-01T00:00:00.000Z', hoursPerTurn: 6, turnsPerWeek: 28, maxBatch: 28, initialCashCents: 10_000_000, initialReputation: 10 });
export const countries = [
  { id:'valdoria', name:'República de Valdoria', description:'Segurança corporativa e economia estável', regions:['Nova Valdoria','Porto Leste','Distrito Central'] },
  { id:'karsen', name:'Federação de Karsen', description:'Indústria e tensões separatistas', regions:['Varkov','Fronteira Norte','Distrito da Capital'] },
  { id:'solmar', name:'Emirado de Solmar', description:'Energia e tensões fronteiriças', regions:['Capital de Solmar','Campos Energéticos','Fronteira Desértica'] },
  { id:'norvik', name:'Confederação de Norvik', description:'Portos e instabilidade regional', regions:['Porto de Norvik','Interior','Costa Oriental'] },
  { id:'arken', name:'União de Arken', description:'Tecnologia e estabilidade institucional', regions:['Capital de Arken','Polo Tecnológico','Distrito Norte'] }
];
export const organizations = [
 ['gov-valdoria','Governo de Valdoria','government'], ['corp-meridian','Meridian Holdings','corporation'],
 ['gov-karsen','Governo de Karsen','government'], ['faction-north','Frente do Norte','armed_faction'],
 ['gov-solmar','Conselho de Solmar','government'], ['corp-helion','Helion Energy','corporation'],
 ['gov-norvik','Conselho de Norvik','government'], ['civil-relief','Asterra Relief','civil'],
 ['gov-arken','Governo de Arken','government'], ['corp-nexa','Nexa Systems','corporation'],
 ['pmc-iron','Iron Shield Security','rival_pmc'], ['pmc-wolf','Red Wolf Group','rival_pmc'], ['pmc-aegis','Aegis Dynamics','rival_pmc']
].map(([id,name,type])=>({id,name,type}));
