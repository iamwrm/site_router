'use strict';

const search = document.querySelector('#site-search');
const status = document.querySelector('#search-status');
const empty = document.querySelector('#search-empty');
const sites = [...document.querySelectorAll('#site-list > li')].map(row => ({
  row,
  text: `${row.textContent} ${row.querySelector('a').getAttribute('href')}`.toLowerCase(),
}));

function filterSites() {
  const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const site of sites) {
    const matches = terms.every(term => site.text.includes(term));
    site.row.hidden = !matches;
    if (matches) count++;
  }
  empty.hidden = count !== 0;
  status.textContent = `${count} of ${sites.length} sites`;
}

search.addEventListener('input', filterSites);
document.querySelector('.site-search').hidden = false;
filterSites();
