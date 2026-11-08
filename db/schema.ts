import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, uniqueIndex, index, primaryKey, check } from 'drizzle-orm/sqlite-core';
// Immutable legacy archive. Read only when importing an existing campaign.
export const campaigns=sqliteTable('online_campaigns',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),requestId:text('request_id').notNull(),
 createPayload:text('create_payload').notNull(),name:text('name').notNull(),version:integer('version').notNull().default(0),state:text('state_json').notNull(),
},t=>[uniqueIndex('campaign_creation').on(t.owner,t.requestId)]);
export const games=sqliteTable('online_games',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),requestId:text('creation_request_id').notNull(),createPayload:text('creation_payload').notNull(),
 name:text('name').notNull(),seed:text('seed').notNull(),rulesVersion:text('rules_version').notNull(),startDate:text('start_date').notNull(),
 turn:integer('current_turn').notNull().default(0),cash:integer('cash_cents').notNull(),reputation:integer('reputation').notNull(),status:text('status').notNull(),
 stateVersion:integer('state_version').notNull().default(0),revision:integer('revision').notNull().default(0),activeRequest:text('active_request'),commitToken:text('commit_token').notNull(),createdOrder:integer('created_order').notNull(),
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
