import { portfolio as data } from './portfolio-data.js';
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const link = (label, url, className) => {
  const node = el('a', className, label);
  node.href = url;
  if (url.startsWith('https:')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
};
const socialLinks = () => [link('email', `mailto:${data.email}`), link('github', data.github), link('linkedin', data.linkedin)];
document.querySelector('h1').textContent = data.headline;
document.querySelector('.subtitle').textContent = data.title;
document.querySelector('#bio').textContent = data.bio;
document.querySelector('#social-links').append(...socialLinks());
document.querySelector('#contact-links').append(...socialLinks());
document.querySelector('#discord').textContent = data.discord;
document.querySelector('#languages').append(...data.languages.map(name => el('li', '', name)));
for (const project of data.projects) {
  const card = el('article', `project-card${project.image ? '' : ' text-card'}`);
  if (project.image) {
    const area = el('div', `project-image ${project.imageClass || ''}`);
    const image = el('img'); image.src = project.image; image.alt = project.alt; image.loading = 'lazy'; image.width = 640; image.height = 360;
    area.append(image);
    card.append(area);
  }
  const body = el('div', 'card-body');
  const heading = el('h3');
  heading.append(project.url ? link(project.title, project.url, 'project-link') : document.createTextNode(project.title));
  body.append(heading, el('p', 'role', project.role), el('p', 'description', project.description));
  if (project.websiteLabel) body.append(link(project.websiteLabel, project.url, 'website-link'));
  if (project.gallery) {
    const gallery = el('div', 'asset-links');
    gallery.append(...project.gallery.map(asset => link(asset.label, asset.src)));
    body.append(gallery);
  }
  card.append(body); document.querySelector('#featured-projects').append(card);
}
for (const [index, repo] of data.repositories.entries()) {
  const card = el('article', 'repo');
  const heading = el('h4'); heading.append(link(repo.title, repo.url)); card.append(heading);
  if (repo.description) card.append(el('p', '', repo.description));
  if (repo.language) card.append(el('span', 'meta', repo.language));
  document.querySelector(index < 6 ? '#repo-list' : '#remaining-repos').append(card);
}
const remaining = data.repositories.length - 6;
if (remaining > 0) document.querySelector('summary').textContent = `more repositories (${remaining})`;
else document.querySelector('#more-repositories').remove();
for (const item of data.experience) {
  const row = el('article', 'experience-row'); const content = el('div'); const heading = el('h3');
  heading.append(item.url ? link(item.company, item.url) : document.createTextNode(item.company));
  content.append(heading, el('p', 'experience-role', item.role));
  if (item.description) content.append(el('p', 'description', item.description));
  row.append(content);
  if (item.dates) row.append(el('p', 'dates', item.dates));
  document.querySelector('#experience').append(row);
}
