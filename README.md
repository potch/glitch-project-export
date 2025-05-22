# glitch-project-export

Exports all your _public_ Glitch projects and keeps them up-to-date.

## Install

`npm i -g @potch/glitch-project-export`

## Usage

Will write project exports to the current directory.

```
usage: glitch-project-export [command] [-u username]

Available commands:
  list:   list add discovered projects
  export: exports all projects using 'git clone'
  update: updates all cloned projects using 'git pull'

Available options:
  -u  use the provided username to fetch the project list
```
