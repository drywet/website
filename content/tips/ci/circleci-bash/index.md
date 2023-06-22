---
title: "CircleCI + Bash tips"
description: "CircleCI + Bash tips"
lead: ""
date: 2023-05-12T16:35:16+02:00
lastmod: 2023-05-12T16:35:16+02:00
draft: false
images: [ ]
weight: 200
toc: true
categories: [ CI ]
tags: [ CI ]

summary: ""
contributors: [ ]
pinned: false
homepage: false
author:
  name: Marat Sahabudinov
  url: https://cotips.dev

---

## CircleCI tips

#### 1. JSON schema {#json-schema}

For CI configs, choose `CircleCI config.yml` JSON schema in IDE:

[//]: # (@formatter:off)

{{< img src="idea-json-schema.png" alt="JSON schema check in Intellij IDEA" class="img-fluid blur-up theme-light" >}}
{{< img src="idea-json-schema-dark.png" alt="JSON schema check in Intellij IDEA" class="img-fluid blur-up theme-dark" >}}

[//]: # (@formatter:on)

#### 2. Split out large scripts {#split-out-large-scripts}

Long / medium size Bash scripts shouldn't be inlined in CI steps. The scripts have to be moved to separate .sh files and
sourced in config.yml like this:

```bash
source .circleci/scripts/some-action.sh
```

This makes config.yml shorter and enables syntax check/highlighting for Bash scripts.  \
Even though IDEA has support for inline syntax highlighting, it's still less convenient.

#### 3. Don't substitute CircleCI pipeline parameters in Bash scripts {#dont-substitute-circle-ci-pipeline-parameters-in-bash-scripts}

Substitution with `<< pipeline.project.git_url >>` syntax **in Bash scripts** is done plainly, without any escaping of
whitespace or special chars.  \
Instead, map them to env variables and use the env variables in Bash scripts:

```yaml
version: 2.1

parameters:
  some-param:
    type: string
    default: ""
  another-param:
    type: string
    default: ""

jobs:
  test:
    environment:
      # Mapping params here:
      someParam: << pipeline.parameters.some-param >>
      anotherParam: << pipeline.parameters.another-param >>
      gitBranch: << pipeline.git.branch >>
    steps:
      - run:
        name: Test
        command: |
          echo "someParam: $someParam"
          echo "anotherParam: $anotherParam"
          echo "gitBranch: $gitBranch"
```

##### 3.1. Reusing mapped pipeline variables {#reusing-mapped-pipeline-variables}

Most likely, you'll need to use pipeline variables in various jobs/steps, so not to map them every time, you can do this
once for all possible pipeline variables used anywhere in your scripts.

###### 3.1.1. Option 1 - yaml anchor {#yaml-anchors}

```yaml
version: 2.1

parameters:
  some-param:
    type: string
    default: ""
  another-param:
    type: string
    default: ""

pipeline-params:
  environment: &pipeline-params
    someParam: << pipeline.parameters.some-param >>
    anotherParam: << pipeline.parameters.another-param >>
    gitBranch: << pipeline.git.branch >>

jobs:
  test:
    environment:
      <<: *pipeline-params
    steps:
      - run:
        name: Test
        command: |
          echo "someParam: $someParam"
          echo "anotherParam: $anotherParam"
          echo "gitBranch: $gitBranch"
```

###### 3.1.2. Option 2 - create a separate initialization command {#create-a-separate-initialization-command}

A separate "init" command can be reused in all jobs. This allows unified preprocessing of params.

```yaml
version: 2.1

parameters:
  some-param:
    type: string
    default: ""
  another-param:
    type: string
    default: ""

commands:
  init:
    steps:
      environment:
        someParam: << pipeline.parameters.some-param >>
        anotherParam: << pipeline.parameters.another-param >>
        gitBranch: << pipeline.git.branch >>
      steps:
        - run:
          name: Init
          command: |
            # Transform params if needed
            [[ $someParam ]] || someParam="<empty>"

            # Propagate the variables to further steps
            export someParam
            declare -p someParam >> "$BASH_ENV"
            export anotherParam
            declare -p anotherParam >> "$BASH_ENV"
            export gitBranch
            declare -p gitBranch >> "$BASH_ENV"

jobs:
  test:
    steps:
      - init
      - run:
        name: Test
        command: |
          echo "someParam: $someParam"
          echo "anotherParam: $anotherParam"
          echo "gitBranch: $gitBranch"
```

#### 4. Passing env variables between **steps** {#passing-variables-between-steps}

This is needed to pass results of steps further.  \
Serialize variables and store them to "$BASH_ENV" file, which is automatically "sourced" by CircleCI on the next CI
step. Example:

```bash
result="some string ' \"
with special characters"

export result
declare -p result >> "$BASH_ENV"
```

Here, `declare -p result` correctly serializes the variable. The representation may vary depending on the shell:

```bash
declare -x result="some string ' \"
with special characters"

# or

export result=$'some string \' "\nwith special characters'
```

Note: `declare` and `typeset` commands are synonyms.

#### 5. Passing env variables between **jobs** {#passing-variables-between-jobs}

While "$BASH_ENV" file is accessible between steps, it needs explicit propagation between jobs through CircleCI
workspaces. Workspaces allow you to store files in one job and restore them in further jobs.

```yaml
store-bash-env:
  steps:
    - run:
      name: Store "$BASH_ENV" file to the workspace
      command: |
        mkdir -p /tmp/bash-env
        cp "$BASH_ENV" /tmp/bash-env/bash-env.sh
    - persist_to_workspace:
      root: /tmp/bash-env
      paths: [ "bash-env.sh" ]
restore-bash-env:
  steps:
    - attach_workspace:
      at: /tmp/bash-env
    - run:
      name: Restore "$BASH_ENV" file from the workspace
      command: |
        file=/tmp/bash-env/bash-env.sh
        if [[ -f "$file" ]]; then
          echo "Found the file '$file'"
          cp "$file" "$BASH_ENV"
          source "$BASH_ENV"
        fi
```

#### 6. Running steps on job failure/always {#running-steps-on-job-failure-or-always}

By default, if a job is failing, no further steps are executed. This behavior can be controlled per-step,
with [the "when" attribute](https://circleci.com/docs/configuration-reference/#the-when-attribute).  \
Allowed values are: `always`, `on_success`, `on_fail` (default: `on_success`)

```yaml
- run:
    name: Notify on failure
    command: sh .circleci/scripts/notify.sh "error"
    when: on_fail
```

The [Slack orb](https://circleci.com/developer/orbs/orb/circleci/slack) uses this exact mechanism to send failure
notifications.

#### 7. Slack orb - conditional notifications {#slack-orb-conditional-notifications}

If you want to decide dynamically in your CI Bash scripts whether to send a notification to Slack with
the [Slack orb](https://circleci.com/developer/orbs/orb/circleci/slack), as of now (June 2023) one of the easiest way to
do that is to temporarily unset the values of `CIRCLE_BRANCH` and `CIRCLE_TAG` env vars before the "slack/notify" step:

```bash
CIRCLE_BRANCH_="$CIRCLE_BRANCH"
CIRCLE_TAG_="$CIRCLE_TAG"
declare -p CIRCLE_BRANCH_ >> "$BASH_ENV"
declare -p CIRCLE_TAG_ >> "$BASH_ENV"
echo 'unset CIRCLE_BRANCH' >> "$BASH_ENV"
echo 'unset CIRCLE_TAG' >> "$BASH_ENV"
```

After the "slack/notify" step, the values have to be restored:

```bash
CIRCLE_BRANCH="$CIRCLE_BRANCH_"
CIRCLE_TAG="$CIRCLE_TAG_"
declare -p CIRCLE_BRANCH >> "$BASH_ENV"
declare -p CIRCLE_TAG >> "$BASH_ENV"
```

Make sure both of those extra steps
are [called only on success/failure or always](#running-steps-on-job-failure-or-always),
depending on your notification "event" param

## Bash tips

#### 1. IDE support {#ide-support}

Make sure you have Shell script checking & formatting support in your IDE:  \
[preinstalled plugin in JetBrains IDEs](https://plugins.jetbrains.com/plugin/13122-shell-script)

#### 2. Bash vs other languages {#bash-vs-other-languages}

For more advanced data processing, prefer writing scripts in a proper programming language like Python, rather than
Bash. However, Bash is a good choice for glue code.

#### 3. Double-quote variables {#double-quote-variables}

Always double-quote variables as `"$someVariable"`, i.e. put them in string literals to prevent word splitting and
glob expansion. An exception is `[[ ... ]]` test statements, where variables can be unquoted.

#### 4. Separate `export variable` and assignment {#separate-export-variable-and-assignment}

Separate `export variable` and `variable=<expression>` statements if `<expression>` isn't just a string literal but a
command that can fail.  \
Otherwise, if the `<expression>` fails, `export` would override its return code with 0.

#### 5. Add `set -eo pipefail` to functions {#add-set-eo-pipefail-to-functions}

CircleCI automatically adds `set -eo pipefail` to scripts, so they fail fast at the failing line, and piping with `|`
doesn't override a non-zero return code.  \
However, when you call Bash functions this is ignored, so `set -eo pipefail` must be added to each function definition.

#### 6. `[[...]]` vs `[...]` {#test-statement}

For testing / logical conditions, `[[ ... ]]` is preferable over `[ ... ]` or `test ...`.

#### 7. Operator priority {#operator-priority}

Outside `[[ ... ]]` the `&&` and `||` operators have the same priority, so `... && ...` may need to be wrapped
in `( ... )`

#### 8. Return code of the latest command is available in `$?` variable {#return-code-of-the-latest-command}

#### 9. A ternary operator equivalent for Bash {#ternary-operator-equivalent-for-bash}

```bash
a=$([[ $b == 'c' ]] && echo t || echo f)
echo "$a"
# outputs: t
```

It works because if `&&` or `||` operators are applied after a test statement, the `set -e` fail fast option doesn't
have an effect.

#### 10. Boolean values: `t` and `f` instead of `true` and `false` {#boolean-values-t-and-f-instead-of-true-and-false}

Using `t` and `f` strings as boolean values can be safer than using `true` and `false`.  \
This is because there already exist `true` and `false` Bash builtins returning 0 and 1 codes correspondingly.

#### 11. echo vs printf {#echo-vs-printf}

`echo "$variable"` command is lossy - the printed text may be different from the actual `$variable` value. `echo`
behavior also depends on shell implementation.  \
A lossless alternative is `printf '%s' "$variable"`

#### 12. Local and CI shell compatibility {#local-and-ci-shell-compatibility}

Speaking about shell implementation, try to write your scripts in a compatible way, so that they would give exactly
the same results on your development machine in your native shell (e.g. zsh for macOS) and in the CI docker image. This
makes development and local testing easier.

#### 13. Compatible `sed` in-place editing {#compatible-sed-in-place-editing}

There's a known incompatibility between macOS (BSD) and Linux (GNU) `sed` commands in in-place editing mode.  \
The "in-place" feature has to be implemented manually: store the sed output to a temporary file, then move the temp file
to replace the original one.

#### 14. Temp directory for local development {#temp-directory-for-local-development}

If you need a temp directory in CI scripts, prefer a .gitignored `tmp` directory in your project to the system `/tmp`
dir.  \
This is to make development and local testing easier - you would see temp files right in your IDE file tree.

#### Cheatsheet

[https://devhints.io/bash](https://devhints.io/bash)
