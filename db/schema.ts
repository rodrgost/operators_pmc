import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const campaigns=sqliteTable('online_campaigns',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),requestId:text('request_id').notNull(),
 createPayload:text('create_payload').notNull(),name:text('name').notNull(),version:integer('version').notNull().default(0),
 state:text('state_json').notNull(),
},table=>[uniqueIndex('campaign_creation').on(table.owner,table.requestId)]);
