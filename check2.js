const urls = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=897503370&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=986110663&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=1148765001&single=true&output=csv'
];

async function check() {
  let found = false;
  for (const url of urls) {
    const res = await fetch(url);
    const data = await res.text();
    const lines = data.split('\n');
    const header = lines[0].split(',');
    const match = lines.find(l => l.includes('26P06') && l.includes('26P07'));
    if (match) {
      found = true;
      console.log('Found in a URL!');
      // Since it's CSV, correctly split taking into account commas inside quotes is tricky, but let's assume it's clean enough for simple check or wait, let's just do a proper regex split if needed.
      // But standard split by comma is enough for simple dates
      const cols = match.split(',');
      for(let i=1; i<=10; i++) {
        const sNum = String(i).padStart(2,'00');
        const cStatusIdx = header.indexOf(`S${sNum}_Casting_Status`);
        const cDateIdx = header.indexOf(`S${sNum}_Casting_Date`);
        console.log(`S${sNum}: status='${cols[cStatusIdx]}', date='${cols[cDateIdx]}'`);
      }
    }
  }
}
check();
