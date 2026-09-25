require('dotenv').config({path:'.env.local',quiet:true});
const {initializeApp,cert}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const app=initializeApp({credential:cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,'\n')})});
const db=getFirestore(app,'dark');
(async()=>{
  const ref=db.collection('platform_settings').doc('public');
  await db.runTransaction(async tx=>{const old=await tx.get(ref);tx.set(ref,{demoFee:99,freeDemo:false},{merge:true});tx.set(db.collection('admin_audit').doc(),{action:'SET_DEMO_PRICE',actor:'owner-authorized-setup',before:{demoFee:old.data()?.demoFee??null,freeDemo:old.data()?.freeDemo??null},after:{demoFee:99,freeDemo:false},at:new Date()});});
  const current=(await ref.get()).data();console.log(JSON.stringify({demoFee:current.demoFee,freeDemo:current.freeDemo}));
})().catch(()=>{console.error('Demo pricing update failed');process.exitCode=1;});
