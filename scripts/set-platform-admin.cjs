/* Run only by the project owner in a trusted environment. Never expose as API. */
require('dotenv').config({path:'.env.local',quiet:true});
const {initializeApp,cert}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const uid=process.argv[2];
if(!uid || process.argv.length > 4) throw new Error('Usage: node scripts/set-platform-admin.cjs FIREBASE_UID [revoke]');
if(process.argv[3] && process.argv[3] !== 'revoke') throw new Error('Third argument must be revoke');
initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n')})});
(async()=>{const auth=getAuth();const user=await auth.getUser(uid);const claims={...user.customClaims};if(process.argv[3]==='revoke')delete claims.admin;else claims.admin=true;await auth.setCustomUserClaims(uid,claims);await auth.revokeRefreshTokens(uid);console.log('Administrator access updated. Sign out and sign in again.');})().catch(()=>{console.error('Could not update administrator access. Check the UID and server credentials.');process.exitCode=1;});
