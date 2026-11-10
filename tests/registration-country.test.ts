import {it,expect} from 'vitest';
import {setupImmediate} from './online-helpers.ts';
it('persists registration country, rejects invalid choices and protects creation retries',async()=>{
 const {call,db}=setupImmediate();
 const command={requestId:'country-create',name:'Registered PMC',seed:'country',registrationCountryId:'karsen'};
 const created=await call('/games',command);expect(created.status).toBe(201);
 expect(created.data.registrationCountryName).toBe('Federação de Karsen');
 expect((await call('/games')).data[0].registrationCountryId).toBe('karsen');
 expect((await call('/games/'+created.data.id)).data.registrationCountryId).toBe('karsen');
 expect((await call('/games',command)).data.id).toBe(created.data.id);
 expect((await call('/games',{...command,registrationCountryId:'arken'})).status).toBe(409);
 expect((await call('/games',{...command,requestId:'bad-country',registrationCountryId:'invalid'})).status).toBe(400);
 expect(()=>db.prepare('UPDATE online_games SET registration_country_id=? WHERE id=?').run('arken',created.data.id)).toThrow();
 const legacy=await call('/games',{requestId:'old-client',name:'Legacy PMC',seed:'country'});expect(legacy.data.registrationCountryId).toBeNull();
});
