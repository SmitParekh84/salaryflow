@AGENTS.md

# Pushing this repo — use the SmitParekh84 SSH key, not the Monarch one

This machine's **global** git identity is the Monarch account
(`Smit Parekh <smitp@monovative.com>`). This repo belongs to a different GitHub
account, **SmitParekh84**, and must never be pushed as Monarch.

The separation is done with an SSH host alias, so it is the *remote URL* that
selects the key. Both remotes here are already set to it:

```
origin    git@github-salaryflow:SmitParekh84/salaryflow.git
upstream  git@github-salaryflow:SmitParekh84/salaryflow.git
```

`github-salaryflow` is defined in `~/.ssh/config` and resolves to `github.com`
using `~/.ssh/id_ed25519_salaryflow` with `IdentitiesOnly yes`. A remote written
against plain `github.com` would fall through to the default identity and push
as the wrong account — so never "fix" a remote by rewriting it to
`git@github.com:...` or to an HTTPS URL.

Repo-local config already overrides the global identity; leave it in place:

| setting | value |
| --- | --- |
| `user.name` | `SmitParekh84` |
| `user.email` | `smartparekh02@gmail.com` |
| `core.sshCommand` | `ssh -F ~/.ssh/config` |

Verify before a first push in a fresh clone or a new worktree:

```bash
ssh -T git@github-salaryflow        # expect: Hi SmitParekh84!
git config --local user.email       # expect: smartparekh02@gmail.com
```

If `ssh -T` greets any other username, stop — the key is on the wrong account
and pushing will attribute the work to it.

Two notes for a fresh clone: `git clone` writes an `origin` pointing at whatever
URL it was given, and repo-local `user.*` is **not** carried by a clone, so both
have to be set again before the first commit.
