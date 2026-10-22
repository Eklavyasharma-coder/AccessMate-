const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const path = require('node:path'); const { createRateLimiter } = require('../src/middleware/security.middleware');
test('rate limiter blocks requests above configured maximum', async () => {
 const limit=createRateLimiter({windowMs:60000,max:2});const req={ip:'stable-stage7-test'};
 const hit=()=>new Promise(resolve=>{const res={setHeader(){},status(code){this.statusCode=code;return this;},json(body){resolve({status:this.statusCode,body});}};limit(req,res,()=>resolve({status:200}));});
 assert.equal((await hit()).status,200);assert.equal((await hit()).status,200);assert.equal((await hit()).status,429);
});
test('production CORS excludes implicit development origins and disables credential CORS',()=>{const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');assert.match(app,/process\.env\.NODE_ENV === 'production' \? configuredOrigins/);assert.match(app,/credentials: false/);});
test('AI analysis caps input and checks document ownership',()=>{const route=fs.readFileSync(path.join(__dirname,'../src/routes/ai.routes.js'),'utf8');assert.match(route,/text\.length > 60000/);assert.match(route,/question\.length > 4000/);assert.match(route,/findByIdAndUser/);});
test('uploads check signatures after extension allow-listing',()=>{const route=fs.readFileSync(path.join(__dirname,'../src/routes/documents.routes.js'),'utf8');assert.match(route,/validateFileSignature/);assert.match(route,/File content does not match its extension/);});
test('authentication endpoints use a limiter and JWT requires a long secret',()=>{const routes=fs.readFileSync(path.join(__dirname,'../src/routes/auth.routes.js'),'utf8');const auth=fs.readFileSync(path.join(__dirname,'../src/services/auth.service.js'),'utf8');assert.match(routes,/router\.use\(authRateLimit\)/);assert.match(auth,/JWT_SECRET\.length < 32/);});
