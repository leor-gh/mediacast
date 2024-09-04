#!/usr/bin/env sh

branch=new-gh-pages

# abort on errors
set -e

# set up git worktree that maps to the gh pages branch with dist as the root
worktree=$(git worktree list | awk "\$3 == \"[$branch]\" { print \$0 }")
[ -z "$worktree" ] && {
    rm -fr dist
    git worktree add dist $branch
}

# build
npm run build

# npm build deletes the dist directory.  need to restore the worktree config
echo gitdir: ../.git/worktrees/dist > dist/.git

# navigate into the build output directory
cd dist

git add -A
