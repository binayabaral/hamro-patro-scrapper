const puppeteer = require('puppeteer');
const { promisify } = require('util');
const fs = require('fs');

const writeFileAsync = promisify(fs.writeFile); // (A)

const SAVE_FILE_FOR_EACH_YEAR = true;

const RECORDS_OF_YEAR = [];
for (let y = 2081; y <= 2081; y++) {
  RECORDS_OF_YEAR.push(y);
}
const MONTHS = (() =>
  Array(12)
    .fill(true)
    .map((item, index) => index + 1))();

let data = [];
const getHost = (year, month) => `https://www.hamropatro.com/calendar/${year}/${month}/`;

const scrapHamroPatro = function scrapHamroPatro(page) {
  return async function* (host) {
    console.log(`Fetching ${host}`);
    await page.goto(host, { waitUntil: 'networkidle2' });
    const bodyHandle = await page.$('body');
    const body = await page.evaluate(body => {
      const tableOfNepEngNums = new Map([
        ['०', 0],
        ['१', 1],
        ['२', 2],
        ['३', 3],
        ['४', 4],
        ['५', 5],
        ['६', 6],
        ['७', 7],
        ['८', 8],
        ['९', 9]
      ]);

      function nepToEngNum(strNum) {
        return String(strNum)
          .split('')
          .map(function (ch) {
            if (ch === '.' || ch === ',') {
              return ch;
            }
            return tableOfNepEngNums.get(ch);
          })
          .join('');
      }

      // !For Events
      const days = Array.from(body.querySelectorAll('.calendar .dates li:not(disable)'))
        .filter(
          item =>
            ![...item.classList].includes('disable') && (item.querySelector('span.event') || {}).innerText !== '--'
        )
        .map(item => {
          let tempArr = [];
          let events = (item.querySelector('span.event') || {}).innerText.split('/');
          for (let i = 0; i <= events.length; i++) {
            if (events[i]) {
              tempArr.push({
                'Start Date': item.id.replace(/-/g, '/'),
                Subject: events[i].trim(),
                'All Day Event': 'TRUE'
              });
            }
          }
          return tempArr;
        });

      // !For Dates
      // const days = Array.from(body.querySelectorAll('.calendar .dates li:not(disable)'))
      //   .filter(item => ![...item.classList].includes('disable'))
      //   .map(item => ({
      //     Subject: (item.querySelector('span') || {}).id.split('-u')[0],
      //     'Start Date': item.id.replace(/-/g, '/'),
      //     'All Day Event': 'TRUE'
      //   }));

      return days;
    }, bodyHandle);

    yield body;
  };
};
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const scrap = scrapHamroPatro(page);
  try {
    for await (const year of RECORDS_OF_YEAR) {
      // data[year] = [];
      for await (const month of MONTHS) {
        // const monthIndex = data[year].push({ month });
        for await (const days of scrap(getHost(year, month))) {
          //   data[year][monthIndex - 1].days = days;
          data = [...data, ...days];
        }
      }
      if (SAVE_FILE_FOR_EACH_YEAR) {
        await writeFileAsync(`data/years/${year}.json`, JSON.stringify(data));
      }
    }
  } catch (e) {
    console.error(e);
  }
  if (!SAVE_FILE_FOR_EACH_YEAR) {
    await writeFileAsync('data/data.json', JSON.stringify(data));
  }
  console.log('Finished...');
  await browser.close();
})();
