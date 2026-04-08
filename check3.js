const Papa = require('papaparse');

const urls = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=897503370&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=986110663&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSYeDumCIH7QI8xYclwmyKNTPXeZJ7LLgzsuaKy3gJplOB7P7zehSvorkl0w53CNlcqpN6eBvKbEriA/pub?gid=1148765001&single=true&output=csv'
];

async function check() {
  for (const url of urls) {
    const res = await fetch(url);
    const text = await res.text();
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const row = results.data.find(r => r['Span ID'] === '26P06-26P07');
        if (row) {
          console.log('--- Found 26P06-26P07! ---');
          for(let i=5; i<=9; i++) {
            const sNum = String(i).padStart(2, '00');
            console.log(`S${sNum} Status: ${row[\`S\${sNum}_Casting_Status\`]} | Date: ${row[\`S\${sNum}_Casting_Date\`]}`);
          }
        }
      }
    });
  }
}
check();
