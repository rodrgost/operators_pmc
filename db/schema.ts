import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index, primaryKey, check, foreignKey } from 'drizzle-orm/sqlite-core';
// Immutable legacy archive. Read only when importing an existing campaign.
export const campaigns=sqliteTable('online_campaigns',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),requestId:text('request_id').notNull(),
 createPayload:text('create_payload').notNull(),name:text('name').notNull(),version:integer('version').notNull().default(0),state:text('state_json').notNull(),
},t=>[uniqueIndex('campaign_creation').on(t.owner,t.requestId)]);
export const games=sqliteTable('online_games',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),requestId:text('creation_request_id').notNull(),createPayload:text('creation_payload').notNull(),
 name:text('name').notNull(),seed:text('seed').notNull(),rulesVersion:text('rules_version').notNull(),startDate:text('start_date').notNull(),
 turn:integer('current_turn').notNull().default(0),cash:integer('cash_cents').notNull(),reputation:integer('reputation').notNull(),status:text('status').notNull(),
 stateVersion:integer('state_version').notNull().default(0),revision:integer('revision').notNull().default(0),activeRequest:text('active_request'),commitToken:text('commit_token').notNull(),createdOrder:integer('created_order').notNull(),personnelVersion:text('personnel_version').notNull().default('personnel-0.1'),personnelInitialized:integer('personnel_initialized').notNull().default(0),operationsInitialized:integer('operations_initialized').notNull().default(0),operationsVersion:text('operations_version').notNull().default('operations-0.1'),
},t=>[uniqueIndex('online_game_creation').on(t.owner,t.requestId),index('online_game_owner').on(t.owner,t.createdOrder),check('online_game_turn',sql`${t.turn} >= 0`),check('online_game_reputation',sql`${t.reputation} BETWEEN 0 AND 100`),check('online_game_revision',sql`${t.revision} >= 0 AND ${t.stateVersion} >= 0`)]);
export const commands=sqliteTable('online_commands',{
 gameId:text('game_id').notNull().references(()=>games.id,{onDelete:'cascade'}),requestId:text('request_id').notNull(),payload:text('payload_json').notNull(),
 requestedTurns:integer('requested_turns').notNull(),processedTurns:integer('processed_turns').notNull(),status:text('status').notNull(),reason:text('reason'),lastTurn:integer('last_turn').notNull(),resultVersion:integer('result_version').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.requestId]}),check('online_command_progress',sql`${t.processedTurns} BETWEEN 0 AND ${t.requestedTurns} AND ${t.requestedTurns} BETWEEN 1 AND 28`),check('online_command_status',sql`${t.status} IN ('processing','completed','interrupted','failed')`)]);
export const events=sqliteTable('online_events',{
 gameId:text('game_id').notNull().references(()=>games.id,{onDelete:'cascade'}),turn:integer('turn').notNull(),sequence:integer('sequence').notNull(),type:text('event_type').notNull(),title:text('title').notNull(),description:text('description').notNull(),important:integer('important').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.turn,t.sequence]}),check('online_event_order',sql`${t.turn} >= 1 AND ${t.sequence} >= 0`),check('online_event_important',sql`${t.important} IN (0,1)`)]);
export const summaries=sqliteTable('online_turn_summaries',{
 gameId:text('game_id').notNull().references(()=>games.id,{onDelete:'cascade'}),turn:integer('turn').notNull(),date:text('date').notNull(),stateHash:text('state_hash').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.turn]})]);
export const ledger=sqliteTable('online_ledger',{
 gameId:text('game_id').notNull().references(()=>games.id,{onDelete:'cascade'}),sourceId:text('source_id').notNull(),entryType:text('entry_type').notNull(),turn:integer('turn').notNull(),amountCents:integer('amount_cents').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.sourceId,t.entryType]}),index('online_ledger_turn').on(t.gameId,t.turn)]);

export const recruitment=sqliteTable('online_recruitment',{
 gameId:text('game_id').notNull().references(()=>games.id),id:text('id').notNull(),week:integer('week').notNull(),profile:text('profile_json').notNull(),salary:integer('salary_cents').notNull(),bonus:integer('bonus_cents').notNull(),hired:integer('hired').notNull().default(0),
},t=>[primaryKey({columns:[t.gameId,t.id]}),index('recruitment_week').on(t.gameId,t.week),check('recruitment_money',sql`${t.salary}>0 AND ${t.bonus}>=0`)]);
export const operators=sqliteTable('online_operators',{
 gameId:text('game_id').notNull().references(()=>games.id),id:text('id').notNull(),profile:text('profile_json').notNull(),health:integer('health').notNull().default(100),fatigue:integer('fatigue').notNull().default(0),morale:integer('morale').notNull().default(80),loyalty:integer('loyalty').notNull().default(60),hiredTurn:integer('hired_turn').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),check('operator_conditions',sql`${t.health} BETWEEN 0 AND 100 AND ${t.fatigue} BETWEEN 0 AND 100 AND ${t.morale} BETWEEN 0 AND 100 AND ${t.loyalty} BETWEEN 0 AND 100`)]);
export const employment=sqliteTable('online_employment',{
 gameId:text('game_id').notNull(),id:text('id').notNull(),operatorId:text('operator_id').notNull(),salary:integer('salary_cents').notNull(),startTurn:integer('start_turn').notNull(),endTurn:integer('end_turn').notNull(),nextPay:integer('next_pay_turn').notNull(),arrears:integer('arrears_cents').notNull().default(0),status:text('status').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),foreignKey({columns:[t.gameId,t.operatorId],foreignColumns:[operators.gameId,operators.id]}),uniqueIndex('one_active_employment').on(t.gameId,t.operatorId).where(sql`${t.status}='active'`),check('employment_bounds',sql`${t.endTurn}>${t.startTurn} AND ${t.salary}>0 AND ${t.arrears}>=0`)]);
export const squads=sqliteTable('online_squads',{
 gameId:text('game_id').notNull().references(()=>games.id),id:text('id').notNull(),name:text('name').notNull(),specialization:text('specialization').notNull(),leaderId:text('leader_id'),deputyId:text('deputy_id'),directives:text('directives_json').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]})]);
export const members=sqliteTable('online_squad_members',{
 gameId:text('game_id').notNull(),squadId:text('squad_id').notNull(),operatorId:text('operator_id').notNull(),joinedVersion:integer('joined_version').notNull(),joinedTurn:integer('joined_turn').notNull(),leftTurn:integer('left_turn'),
},t=>[primaryKey({columns:[t.gameId,t.squadId,t.operatorId,t.joinedVersion]}),foreignKey({columns:[t.gameId,t.operatorId],foreignColumns:[operators.gameId,operators.id]}),foreignKey({columns:[t.gameId,t.squadId],foreignColumns:[squads.gameId,squads.id]}),uniqueIndex('one_active_squad').on(t.gameId,t.operatorId).where(sql`${t.leftTurn} IS NULL`)]);
export const familiarity=sqliteTable('online_familiarity',{
 gameId:text('game_id').notNull(),low:text('operator_low').notNull(),high:text('operator_high').notNull(),score:integer('score').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.low,t.high]}),foreignKey({columns:[t.gameId,t.low],foreignColumns:[operators.gameId,operators.id]}),foreignKey({columns:[t.gameId,t.high],foreignColumns:[operators.gameId,operators.id]}),check('familiarity_bounds',sql`${t.low}<${t.high} AND ${t.score} BETWEEN 0 AND 100`)]);
export const reservations=sqliteTable('online_reservations',{
 gameId:text('game_id').notNull(),operatorId:text('operator_id').notNull(),kind:text('kind').notNull(),sourceId:text('source_id').notNull(),startTurn:integer('start_turn').notNull(),endTurn:integer('end_turn').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.operatorId]}),foreignKey({columns:[t.gameId,t.operatorId],foreignColumns:[operators.gameId,operators.id]}),check('reservation_bounds',sql`${t.endTurn}>${t.startTurn} AND ${t.kind} IN ('mission','rest','training','recovery')`)]);
export const personnelHistory=sqliteTable('online_personnel_history',{
 gameId:text('game_id').notNull().references(()=>games.id),id:text('id').notNull(),turn:integer('turn').notNull(),type:text('event_type').notNull(),title:text('title').notNull(),data:text('data_json').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),index('personnel_history_turn').on(t.gameId,t.turn)]);
export const actions=sqliteTable('online_actions',{
 gameId:text('game_id').notNull().references(()=>games.id),requestId:text('request_id').notNull(),payload:text('payload_json').notNull(),result:text('result_json').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.requestId]})]);

export const contracts=sqliteTable('online_contracts',{
 gameId:text('game_id').notNull().references(()=>games.id),id:text('id').notNull(),type:text('type').notNull(),title:text('title').notNull(),regionId:text('region_id').notNull(),clientId:text('client_id').notNull(),source:text('source').notNull(),originEventId:text('origin_event_id'),offeredTurn:integer('offered_turn').notNull(),expiresTurn:integer('expires_turn').notNull(),difficulty:integer('difficulty').notNull(),risk:integer('risk').notNull(),intel:text('intel_json').notNull(),reward:integer('reward_cents').notNull(),minimum:integer('minimum_operators').notNull(),status:text('status').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),index('contracts_status_expiry').on(t.gameId,t.status,t.expiresTurn),check('contract_metrics',sql`${t.difficulty} BETWEEN 1 AND 100 AND ${t.risk} BETWEEN 1 AND 100 AND ${t.reward}>0`)]);
export const missions=sqliteTable('online_missions',{
 gameId:text('game_id').notNull(),id:text('id').notNull(),contractId:text('contract_id').notNull(),squadId:text('squad_id').notNull(),leaderId:text('leader_id').notNull(),deputyId:text('deputy_id'),directives:text('directives_json').notNull(),status:text('status').notNull(),startedTurn:integer('started_turn').notNull(),endedTurn:integer('ended_turn'),stage:integer('stage_index').notNull(),dueTurn:integer('stage_due_turn').notNull(),delays:integer('delays').notNull(),points:integer('success_points').notNull(),completedStages:integer('completed_stages').notNull(),advance:integer('advance_cents').notNull(),paid:integer('paid_cents').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),uniqueIndex('one_mission_per_contract').on(t.gameId,t.contractId),foreignKey({columns:[t.gameId,t.contractId],foreignColumns:[contracts.gameId,contracts.id]}),foreignKey({columns:[t.gameId,t.squadId],foreignColumns:[squads.gameId,squads.id]}),index('missions_status').on(t.gameId,t.status)]);
export const assignments=sqliteTable('online_mission_assignments',{
 gameId:text('game_id').notNull(),missionId:text('mission_id').notNull(),operatorId:text('operator_id').notNull(),assignmentType:text('assignment_type').notNull(),role:text('role').notNull(),snapshot:text('snapshot_json').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.missionId,t.operatorId]}),foreignKey({columns:[t.gameId,t.missionId],foreignColumns:[missions.gameId,missions.id]}),foreignKey({columns:[t.gameId,t.operatorId],foreignColumns:[operators.gameId,operators.id]})]);
export const decisions=sqliteTable('online_decisions',{
 gameId:text('game_id').notNull(),id:text('id').notNull(),missionId:text('mission_id').notNull(),stage:integer('stage_index').notNull(),createdTurn:integer('created_turn').notNull(),expiresTurn:integer('expires_turn').notNull(),fallback:text('fallback_action').notNull(),choice:text('chosen_action'),resolvedTurn:integer('resolved_turn'),status:text('status').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),uniqueIndex('one_decision_per_stage').on(t.gameId,t.missionId,t.stage),foreignKey({columns:[t.gameId,t.missionId],foreignColumns:[missions.gameId,missions.id]}),index('decisions_deadline').on(t.gameId,t.status,t.expiresTurn)]);
export const reports=sqliteTable('online_mission_reports',{
 gameId:text('game_id').notNull(),id:text('id').notNull(),missionId:text('mission_id').notNull(),turn:integer('turn').notNull(),summary:text('summary_json').notNull(),audit:text('audit_json').notNull(),
},t=>[primaryKey({columns:[t.gameId,t.id]}),foreignKey({columns:[t.gameId,t.missionId],foreignColumns:[missions.gameId,missions.id]}),index('reports_mission_turn').on(t.gameId,t.missionId,t.turn)]);
