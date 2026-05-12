# 📊 Digital Skill Dashboard (Frontend)

ระบบหน้าจอแสดงผล (Dashboard) สำหรับติดตามและวิเคราะห์ข้อมูลการพัฒนาทักษะดิจิทัลของบุคลากรภายในองค์กร ถูกออกแบบมาให้มีความทันสมัยด้วยสไตล์ Neu-morphism รองรับ Dark/Light Mode และสามารถแสดงผลข้อมูลในรูปแบบของกราฟและสถิติเชิงลึกได้อย่างมีประสิทธิภาพ

---

## ✨ ฟีเจอร์หลัก (Key Features)

- **Interactive Data Visualization**: นำเสนอข้อมูลด้วยกราฟและแผนภูมิจาก `Chart.js` สามารถคลิกเพื่อดูข้อมูลเจาะลึก (Drill-down) ได้
- **Advanced Filtering**: กรองข้อมูลตามเงื่อนไขต่างๆ เช่น โครงการ, ปีงบประมาณ, ประเภท, รูปแบบ และหน่วยงาน
- **Multiple Data Sources**: รองรับการดึงข้อมูลจาก API Backend, Google Sheets (ผ่าน URL) หรือการอัปโหลดไฟล์ Excel (`.xlsx`) เข้ามาโดยตรง
- **Offline & Local Cache**: มีระบบจัดการแคชผ่าน `LocalStorage` ช่วยให้หน้าเว็บโหลดข้อมูลเก่ามาแสดงผลได้ทันทีโดยไม่ต้องรอ API นาน
- **Export Data**: สามารถเลือกส่งออกข้อมูล (Export) เป็นไฟล์ Excel ได้อย่างง่ายดายผ่าน `SheetJS`
- **Customizable UI**: ผู้ใช้สามารถปรับขนาดตัวอักษร, เปลี่ยนธีม (Dark/Light Mode) และเลือกแสดง/ซ่อนส่วนต่างๆ บนหน้าจอได้ตามต้องการ

---

## 📂 โครงสร้างไฟล์ (File Structure)

```text
dashboard/
├── index.html           # โครงสร้างหน้าเว็บหลัก (HTML5)
├── styles.css           # สไตล์ชีท ควบคุมธีม Neu-morphism และ Responsive Design
├── api.js               # จัดการการเชื่อมต่อ API, Fetch ข้อมูล และระบบ Caching
├── dashboard-lib.js     # ฟังก์ชันช่วยเหลือ (Utilities), การจัดการ State และ UI Components
├── charts.js            # กำหนดค่า Configuration และสร้างกราฟต่างๆ (Chart.js)
├── app.js               # สคริปต์หลัก ควบคุมการทำงาน Event Listeners และ Flow ทั้งหมดของระบบ
└── README.md            # ไฟล์เอกสารของส่วน Dashboard (ไฟล์นี้)
```

---

## 🛠 เทคโนโลยีที่ใช้งาน (Tech Stack)

- **Core**: HTML5, Vanilla JavaScript, CSS3 (Custom Variables)
- **Charts**: [Chart.js](https://www.chartjs.org/) & `chartjs-plugin-datalabels`
- **Data Export/Import**: [SheetJS](https://sheetjs.com/)
- **Icons**: [Lucide Icons](https://lucide.dev/)
- **UI Components**: [Swiper JS](https://swiperjs.com/) สำหรับจัดการแกลเลอรีแหล่งข้อมูลในหน้าตั้งค่า

---

## 🚀 การเริ่มต้นใช้งาน (Getting Started)

เนื่องจากระบบนี้ถูกเขียนด้วย HTML, CSS และ Vanilla JavaScript ล้วน คุณจึงสามารถรันหน้าเว็บได้ทันทีโดยไม่ต้องใช้ Node.js หรือ Build Tools วุ่นวาย

1. **ใช้ Live Server (แนะนำ)**: หากใช้ VS Code ให้คลิกขวาที่ไฟล์ `index.html` แล้วเลือก "Open with Live Server" เพื่อจำลองเซิร์ฟเวอร์จำลองและรองรับ Hot Reload
2. **รันผ่าน Backend**: หากคุณรัน Backend (Python FastAPI) ตามโปรเจกต์หลักแล้ว คุณสามารถเข้าใช้งาน Dashboard ผ่าน URL ของ Backend ได้เลย (เช่น `http://localhost:8000`) เนื่องจาก Backend ทำหน้าที่ Serve ไฟล์ Static ให้ด้วย

---

## ⚙️ สถาปัตยกรรมการทำงานของ JavaScript (JS Flow)

เพื่อความง่ายในการบำรุงรักษา โค้ด JavaScript จึงถูกแบ่งออกเป็นโมดูล (แม้จะไม่ได้ใช้ ES6 Modules เต็มรูปแบบแต่ก็แบ่งความรับผิดชอบชัดเจน) ลำดับการโหลดใน `index.html` มีความสำคัญดังนี้:

1. **`api.js`**: ทำงานก่อนเพื่อเตรียมฟังก์ชันและลอจิกเกี่ยวกับการดึง/เก็บข้อมูล (Data Fetching & Cache)
2. **`dashboard-lib.js`**: โหลดตัวช่วยในการจัดฟอร์แมตข้อมูล, สร้างอ็อบเจกต์ UI (เช่น Modal, Toast) และฟังก์ชันคำนวณ
3. **`charts.js`**: จัดการเรื่องกราฟทั้งหมด (ตั้งค่าสี, สร้างตัวแปรเก็บ Instance ของกราฟ)
4. **`app.js`**: โหลดสุดท้ายเพื่อผูก Event Listeners ทั้งหมด, ดึงข้อมูลเริ่มต้น, และเรียกใช้งานฟังก์ชันจากไฟล์อื่นๆ ด้านบน

---

## 📝 การปรับแต่ง (Customization)

### การแก้ไขสีของกราฟ (Chart Colors)
สามารถแก้ไขการตั้งค่าสีของกราฟได้ที่ไฟล์ `charts.js` ภายในตัวแปร `ChartConfigs` ซึ่งอ้างอิงโค้ดสี CSS Variables (เช่น `var(--teal)`, `var(--purple)`)

### การเพิ่มข้อมูลสำหรับการ Export Excel
สามารถเพิ่ม/ลดคอลัมน์ที่ต้องการ Export ได้ในฟังก์ชันการสร้าง Modal Export ของไฟล์ `app.js` ร่วมกับฟังก์ชัน Export ใน `dashboard-lib.js`
