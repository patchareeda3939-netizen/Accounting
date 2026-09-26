/* ================= Firebase (ระบบ Login และฐานข้อมูลกลาง) =================
   ใส่ค่า config จาก Firebase Console → Project settings → Your apps → Web app
   แล้วรัน ./build.sh ใหม่ ถ้าปล่อยเป็น null ระบบจะเก็บข้อมูลในเบราว์เซอร์เหมือนเดิม (ไม่มี Login)
   ค่าเหล่านี้เปิดเผยได้ (เป็นค่าสาธารณะของเว็บแอป) ความปลอดภัยของข้อมูลอยู่ที่ firestore.rules
   ตัวอย่าง:
   var FIREBASE_CONFIG = {
     apiKey: 'AIza...',
     authDomain: 'your-project.firebaseapp.com',
     projectId: 'your-project',
     appId: '1:123:web:abc'
   };
*/
var FIREBASE_CONFIG = null;
// สำหรับนักพัฒนา: ใส่ '127.0.0.1' เพื่อต่อ Firebase Emulator แทนระบบจริง
var FIREBASE_EMULATOR_HOST = null;
