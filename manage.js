#! /usr/bin/env node

const fetch = require('node-fetch');
const fs = require('fs-extra');
const readline = require('readline');
const { spawn } = require('child_process');

const GLITCH_API = 'https://api.glitch.com';

let args = process.argv.slice(2);
const command = args[0];
const CACHE_PATH = process.cwd() + '/cache.json';
let dataCache = {};

if (args.indexOf('-u') > -1) {
  dataCache.login = args[args.indexOf('-u') + 1];
}

async function buildProjectList() {
  let login = dataCache.login;
  let projects = [];
  console.log('fetching projects...');
  let page = await fetch(`${GLITCH_API}/v1/users/by/login/projects?limit=100&login=${login}`).then(r => r.json());
  projects.push(...page.items.map(project => project.domain));
  while (page.hasMore) {
    console.log('fetching more projects...');
    page = await fetch(`${GLITCH_API}${page.nextPage}`).then(r => r.json());
    projects.push(...page.items.map(project => project.domain));
  }
  return projects;
}

async function init() {
  if (fs.existsSync(CACHE_PATH)) {
    dataCache = JSON.parse(fs.readFileSync(CACHE_PATH).toString('utf-8'));
  }

  switch (command) {
    case 'export':
      return clone();
    case 'update':
      return update();
    default:
      return usage();
  }
}

function usage() {
  console.log(`usage: glitch-project-export [command] [-u username]
  
Available commands:
  export: exports all projects using 'git clone'
  update: updates all cloned projects using 'git pull'

Available options:
  -u  use the provided username to fetch the project list`);
}

function ask(prompt, defaultAnswer) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  
    let question = prompt + ' ';
    if (defaultAnswer) {
      question = `${prompt} (${defaultAnswer}) `;
    }

    rl.question(question, answer => {
      rl.close();
      if (answer) {
        resolve(answer);
      } else {
        resolve(defaultAnswer);
      }
    });
  });
}

function writeCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(dataCache, null, 2));
}

async function clone() {
  if (!dataCache.login) {
    dataCache.login = await ask('enter your Glitch username:');
  }
  writeCache();
  let projects = await buildProjectList();
  dataCache.projects = projects;
  writeCache();
  console.log('cloning projects...');

  let count = projects.length;
  let num = 0;
  for (let project of projects) {
    num++;
    console.log(`cloning ${project} (${num}/${count})`);
    let cwd = process.cwd() + '/' + project;
    if (fs.existsSync(cwd)) {
      console.log('> project already cloned!')
    } else {
      await runCommand('git', ['clone', `${GLITCH_API}/git/${project}`]);
    }
  }
}

async function update() {
  if (!dataCache.login) {
    dataCache.login = await ask('enter your Glitch username:');
  }
  writeCache();
  let projects = dataCache.projects;
  if (!projects) {
    projects = await buildProjectList();
    fs.writeFileSync(CACHE_PATH, JSON.stringify(projects, null, 2));
  } else {
    console.log('using cached project list');
  }

  console.log('updating projects...');
  let count = projects.length;
  let num = 0;
  let chunk = 5;
  for (let i = 0; i < projects.length; i += chunk) {
    await Promise.all(projects.slice(i, i + chunk).map(project => {
      num++;
      console.log(`updating ${project} (${num}/${count})`);
      let cwd = process.cwd() + '/' + project;
      if (fs.existsSync(cwd)) {
        return runCommand('git', ['pull'], cwd, project);
      } else {
        console.log('> project not found, try running export to download it?')
      }
    }));
  }
}

function runCommand(command, args, cwd, prefix = '') {
  return new Promise((resolve) => {
    const cmd = spawn(command, args, { cwd });
  
    cmd.stdout.on('data', (data) => {
      console.log(`${prefix}> ${data}`);
    });

    cmd.on('error', (error) => {
      console.log(`${prefix}> Error: ${error}`);
    });
  
    cmd.stderr.on('data', (data) => {
      console.error(`${prefix}> ${data}`);
    });
  
    cmd.on('close', (code) => {
      resolve();
    });
  });
}

init().catch(e => console.error(e));