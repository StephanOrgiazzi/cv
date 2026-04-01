---
title: "Harness Engineering"
date: "2026-03-29"
excerpt: "La Context-Layer Architecture au service du développement agentique"
badges:
  - "Long Read"
  - "Agentic Coding"
locale: "fr"
translationKey: "harness-engineering"
---

# Harness Engineering : la Context-Layer Architecture au service du développement agentique

*Pour les développeurs qui naviguent entre `AGENTS.md/CLAUDE.md`, les skills, les hooks, MCP, et tout le reste.*

---

## Pourquoi c'est important

Vous avez configuré Claude Code, ajouté quelques serveurs MCP, lancé une commande `/init` pour générer un `CLAUDE.md`, et peut-être même ajouté quelques skills. Avec la dernière génération de LLM, ça fonctionne globalement bien la plupart du temps. Mais malgré cela, petit à petit, plus de nouvelles features sont implémentées, plus les choses peuvent devenir bancales : l'agent ignore certains skills, le contexte se remplit trop vite, et la qualité des réponses et du code se dégrade.

Le réflexe habituel est d'en ajouter davantage : plus de skills, plus de règles, plus de documentation. Et pourtant, même si cela peut sembler contre-intuitif, cela dégrade souvent la qualité du code. La plupart des ratés de l'agent sont des **échecs de « context management »**, et entasser du contenu dans la fenêtre de contexte aggrave généralement la situation.

<blockquote class="article-pullquote">
  <p>Chaque règle ajoutée au <code>CLAUDE.md</code>, chaque skill, chaque hook, est un <strong>patch</strong>.</p>
</blockquote>

Ces règles compensent quelque chose que la codebase ne parvient pas à communiquer d'elle-même. Un module bien structuré, avec des conventions cohérentes, n'a pas besoin d'un paragraphe de règles implicites pour être compris : l'agent peut le lire directement.
Ce changement de paradigme est important parce qu'il redéfinit ce à quoi sert réellement le harness engineering. Le but n'est pas d'empiler des couches de règles, mais de rendre chacune superflue, une décision à la fois, en l'encodant dans la codebase elle-même, là où elle devient permanente, visible et impossible à ignorer.
Cet article reviendra sur cette idée à la fin, mais pour l'instant, les couches de contexte méritent d'être comprises précisément parce qu'elles révèlent où se situent les lacunes.

## Le problème central

### Le contexte est un problème de qualité de l'information, pas de capacité

Le modèle d'exécution central d'un agent est une boucle itérative :

<div class="execution-loop" aria-label="Execution loop">
  <span>Récupérer contexte</span>
  <span class="arrow">-&gt;</span>
  <span>Action</span>
  <span class="arrow">-&gt;</span>
  <span>Vérifier le résultat</span>
  <span class="arrow">-&gt;</span>
  <span>Terminé ou nouvelle boucle</span>
</div>

À chaque étape, l'agent puise dans sa "context window" : un buffer de taille fixe qui contient tout ce qu'il "sait" à un instant donné sur la session, y compris les instructions, l'historique de conversation, le contenu des fichiers et les résultats de "tool callings". Quand ce buffer devient surchargé, l'agent ne se dégrade pas proprement : il commence à faire des erreurs subtiles.

**Une mauvaise information dans le contexte est pire qu'une information absente.** Le signal utile s'enfouit sous du contenu non pertinent, et l'agent cesse de distinguer les deux de manière fiable.

### La réponse en context-layers (ou "couches de contexte")

La réponse n'est pas d'ajouter plus de contexte, mais de construire un harness (un cadre) pensé autour de la façon dont chaque outil interagit avec la fenêtre de contexte.

<blockquote class="article-pullquote">
  <p>Le harness est l'ensemble des outils, contraintes et feedbacks qui font fonctionner ces couches de contexte ensemble.</p>
</blockquote>

## Un modèle mental simple

<div class="context-layer-architecture" aria-label="Context-Layer Architecture">
  <div class="cla-shell">
    <div class="cla-panel">
      <h4>Context-Layer Architecture</h4>
      <div class="cla-grid">
        <div class="cla-flow">
          <div class="cla-node">Prompt</div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">Permanent Layer</span>
            <span class="cla-node-meta">CLAUDE.md · AGENTS.md</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">On-Demand Layer</span>
            <span class="cla-node-meta">Skills · MCP · WebSearch · CLI · Subagents</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">System Layer</span>
            <span class="cla-node-meta">Hooks · Permissions</span>
          </div>
          <div class="cla-connector" aria-hidden="true"></div>
          <div class="cla-node">
            <span class="cla-node-title">Feedback Layer</span>
            <span class="cla-node-meta">Tests · Linter · Type Checker · Build</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

En pratique :
1. **Permanent** : ce qui doit être présent systématiquement.
2. **On-demand** : ce qui ne doit être fourni seulement quand l'agent en a besoin.
3. **System** : ce qui doit être imposé par le système (ou l'OS).
4. **Feedback** : ce qui vérifie le résultat après exécution.

---

## Couche 1 : Permanent context (`AGENTS.md/CLAUDE.md`)

Il s'agit du fichier Markdown à la racine du projet qui est systématiquement chargé dans le contexte de l'agent, sans être explicitement invoqué.

Le premier réflexe, quand on en met un en place, est d'écrire tout ce qui passe : vue d'ensemble de l'architecture, structure des dossiers, conventions d'équipe, choix des librairies, notes d'onboarding, etc... Il faut résister à ce réflexe. **Un fichier de contexte permanent doit être court, strict et opérationnel.** Si une règle ne vaut pas la peine d'être appliquée à chaque tâche, elle n'a probablement pas sa place ici.

### Keep it short

[Les fichiers `AGENTS.md/CLAUDE.md` ont tendance à *diminuer* le taux de réussite des tâches par rapport à l'absence totale de fichiers `AGENTS.md/CLAUDE.md`, tout en augmentant le coût d'inférence de plus de 20 %](https://arxiv.org/abs/2602.11988). Les fichiers auto-générés (via `/init` ou équivalent) sont souvent les premiers coupables : ils forcent l'agent à dépenser des tokens de raisonnement sur des informations qu'il pourrait déduire simplement en lisant le code. Des fichiers .md trop volumineux, contradictoires ou sur-spécifiés transforment l'info utile en bruit. Anthropic recommande d'ailleurs de se limiter à 200 lignes maximum.

### Ce qui doit être dans CLAUDE.md/AGENTS.md

L'agent sait déjà lire votre codebase. Ce qui l'aide, c'est ce qu'il *ne peut pas* déduire du code : de la connaissance tacite, des contraintes non évidentes, des pièges subtils qui ont déjà provoqué de vrais problèmes. Il faut penser ce fichier comme **la courte liste de choses que vous diriez à un dev qui arrive sur le projet**.

Trois types de contenu y ont leur place :

Contraintes que l'agent pourrait ne pas déduire du contexte seul.

<div class="instruction-block">

- “Always use pnpm, not npm.”

</div>

#### Gotchas

Pièges subtils propres à la codebase.

<div class="instruction-block">

- “We need to keep folder `/pointOfSaleOld` for backward compatibility. We will remove it once we'll turn the feature flag on.”
- “The auth token lifecycle is per-session, not per-request. Storing it in a closure or `WeakMap` will cause stale-token bugs on long connections.”

</div>

#### Retrieval nudges

Aidez l'agent à obtenir le contexte pertinent lorsque la documentation d'API ne fait pas partie de ses données d'entraînement, en l'orientant vers les skills adaptés, en utilisant la recherche web ou en explorant d'autres repos

<div class="instruction-block">

- “Prefer retrieval-led reasoning over pre-training-led reasoning when using the Expo SDK: always use WebSearch to get docs matching the specific version.”
- “`business-logic` is a sibling repo you may need to navigate and edit when necessary (`cd ../business-logic`).”

</div>

<p class="article-note"><em>Note : dans les sections suivantes, vous verrez qu'une partie de ces éléments peut souvent être déplacée vers la couche « on-demand » ou « system » pour améliorer encore la gestion du contexte.</em></p>

---

## Couche 2 : On-Demand Layer (Skills, MCP, WebSearch, CLI, Subagents)

Tout ce qui n'a pas besoin de résider dans le contexte permanent doit, par défaut, vivre ici.

Le principe est simple : si l'information est spécialisée ou pertinente seulement dans certains contextes, elle doit être récupérée au moment où on en a besoin. Cela réduit le bruit, économise la « context window » et améliore la précision.

### Skills

Quand ils sont bien conçus, les skills sont l'un des leviers les plus efficaces d'un harness. Ils déplacent les connaissances spécialisées hors du contexte permanent vers un modèle de récupération à la demande : l'agent va chercher ce dont il a besoin, quand il en a besoin, plutôt que de tout porter en permanence. La fenêtre de contexte principale reste propre et focalisée.
L'intérêt est aussi cumulatif. Un skill bien écrit pour une librairie ou un workflow spécifique apporte une guidance de niveau expert au bon moment, sans en payer le coût sur chaque tâche sans rapport. C'est l'argument fondamental contre un `CLAUDE.md` qui grossit sans fin : le contexte permanent est un coût fixe, les skills sont un coût variable. En pratique, migrez autant que possible les règles de votre `AGENTS.md` / `CLAUDE.md` vers des skills dédiées (si ça reste pertinent).

Un skill n'est pas seulement un fichier `.md`. C'est une **unité de récupération**, un répertoire en trois parties :

- **`SKILL.md` (obligatoire) :** contient un frontmatter YAML (métadonnées) et des instructions en Markdown. L'agent ne lit d'abord que le nom et la description. Si cela correspond à la demande de l'utilisateur, il ouvre ensuite le fichier pour suivre les instructions.
- **`scripts/` (optionnel) :** du code exécutable (Bash, JS/TS, Python) qui permet à l'agent d'effectuer des actions que le LLM ne peut pas réaliser nativement.
- **`references/` (optionnel) :** de la documentation plus approfondie, chargée uniquement si l'agent doit vérifier un point bien précis en cours de tâche.

#### Les trois grands types de skills

##### 1. Skills de documentation et de connaissance

Même les modèles les plus avancés ont une "knowledge cutoff", une date de coupure des connaissances. Ou bien ils manquent parfois de contexte spécifique au projet.

- **But :** fournir une information que l'agent ne connaît pas, ou qu'il risque de mal se rappeler.
- **Exemple :** si vous utilisez **Expo SDK 55**, l'agent peut ne pas connaître les détails de l'API, simplement parce que cette version en particulier n'était peut-être pas dans ses données d'entraînement.
- **Solution :** [Expo Skills](https://expo.dev/expo-skills)

##### 2. « Behaviors » et « best practices »

Les LLM ont tendance à produire du code « moyen ».

- **But :** pousser l'implémentation vers un niveau de qualité expert, aligné avec les standards du projet.
- **Exemple :** un skill construit à partir de l'article des best practices de l'équipe React [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).
- **Solution :** [React useEffect Skill](https://github.com/softaworks/agent-toolkit/tree/main/skills/react-useeffect)

##### 3. « Functionality » et « tooling »

C'est probablement le type de skill le plus sous-utilisé.

- **But :** donner à l'agent des capacités qu'il n'a pas nativement, en embarquant des scripts qui produisent un résultat que le modèle seul ne peut pas produire.
- **Exemple :** un skill [codebase-visualizer](https://code.claude.com/docs/en/skills) qui exécute un script embarqué pour générer un arbre HTML interactif du projet.
- **Pourquoi c'est important :** sans le script, ce n'est qu'un prompt. Avec le script, c'est un outil. Toute la logique de ce type de skill est là.

#### Risques d'un registre de skills : « bloat » et sécurité

Il est tentant d'installer tous les skills de bonnes pratiques que vous trouvez, mais c'est généralement une erreur :

1. **Bloat de contexte :** même avec du lazy loading, l'agent parcourt la description de chaque skill installé à chaque tour. Avec 50 skills, vous ajoutez plus de 2 000 tokens de bruit à chaque prompt.
2. **Risque de prompt injection :** un skill est un prompt exécutable. Un skill tiers malveillant peut embarquer des instructions cachées qui modifient le comportement de l'agent. **Auditez toujours le `SKILL.md` et les scripts associés avant d'ajouter un skill à votre harness.**

### MCP pour les intégrations « stateful »

MCP (Model Context Protocol) est un standard ouvert pour la communication structurée entre un agent et des systèmes externes. Concrètement, un serveur MCP est un petit service Node.js ou Python qui expose des outils typés que l'agent peut appeler. L'agent découvre les outils, en invoque un, et reçoit une réponse structurée en retour.
Cela devient pertinent dans deux cas principaux :

#### 1. Intégrations authentifiées

Certains systèmes nécessitent une connexion persistante avec credentials qu'une commande shell ponctuelle ne gère pas proprement : [Atlassian](https://github.com/atlassian/atlassian-mcp-server), [GitHub](https://github.com/github/github-mcp-server), [Context7](https://github.com/upstash/context7), et autres.

#### 2. Manipulation d'état externe

MCP est aussi le bon outil quand l'agent doit opérer *à l'intérieur* d'un autre système, pas seulement le requêter.

Un bon exemple est  [Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp?hl=fr) : l'agent peut ouvrir Chrome, inspecter le DOM et le CSS en direct, lire l'activité console et réseau, simuler des flux utilisateur, et enregistrer une trace de performance via DevTools. Il ne se contente pas de récupérer de la documentation sur la page. Il opère à l'intérieur d'une session navigateur active et lit le state résultant. Le state réside dans Chrome, pas dans la fenêtre contextuelle, et MCP est le pont.

Les outils MCP ne sont généralement pas très efficaces en termes de tokens, et peuvent vite coûter cher. **Si vous n'avez pas besoin d'authentification ou d'état externe persistant, vous n'avez probablement pas besoin de MCP.** Un skill résout généralement le même problème avec moins d'overhead et moins de complexité.

### WebSearch et WebFetch pour la récupération d'information

Ces outils sont natifs à la plupart des agents modernes. Ils résolvent deux problèmes :

- **Knowledge cutoff:** un modèle de langage s'entraîne sur un instantané du monde à une date donnée. Pour tout ce qui évolue, une nouvelle version de Next.js, du Expo SDK, un breaking change, le modèle ne sait pas.
- **Erreurs de précision:** même pour des APIs stables présentes dans les données d'entraînement, le modèle peut générer des détails plausibles mais incorrects : mauvaises signatures de méthodes, comportements de cas limites inventés, etc...

`WebSearch` et `WebFetch` répondent aux deux. Architecturalement, ils fournissent de la *récupération à la demande* : au lieu de se fier aux poids du pré-entraînement, l'agent récupère la donnée factuelle et réelle depuis des sources à jour et raisonne à partir de celle-ci.

<div class="instruction-block">

- “Upgrade Storybook from v8 to v10.33 (latest). Don't just upgrade version, make necessary corresponding API changes in the codebase. Use WebSearch to get up to date docs”

</div>

Il est souvent très payant de rendre explicite dans vos prompts, votre AGENTS.md, CLAUDE.md, ou vos skills le fait d'utiliser le tool WebSearch.
**prefer retrieval-led reasoning over pre-training-led reasoning whenever precision matters**
Cela déplace le comportement par défaut de "le modèle sait probablement" vers "vérifier d'abord avant d'agir."

Ces outils ne règlent pas tout. Pour les intégrations nécessitant une authentification persistante ou une manipulation avec état dans un système externe, MCP reste la bonne réponse. De même pour les skills quand l'agent a besoin d'un workflow réutilisable, de conventions locales, ou d'une façon fiable de combiner des outils en séquence reproductible. Préférez une skill quand la valeur est dans comment le travail doit être fait. Préférez WebSearch ou WebFetch quand la valeur est dans la récupération de faits externes actuels : documentation, changelogs, spécifications d'API, détails de référence précis. En pratique : les skills encodent la procédure, les tools WebSearch/WebFetch fournissent les données à jour.

### La CLI comme surface d'exécution
La CLI est une surface d'exécution naturelle pour les agents, et elle se divise en deux catégories :

#### Outils natifs

Les fondamentaux Unix (`find`, `grep`, `sed`, `awk`, `jq`, `curl`) et les workflows git de base sont profondément ancrés dans l'entraînement de la plupart des LLM. Ils ne nécessitent aucune introduction et ont un coût de contexte quasi nul. L'agent peut les enchaîner, les piper, et les adapter à des situations nouvelles sans instructions explicites. Si une tâche peut être accomplie avec des outils shell standard, c'est généralement le bon choix.

#### CLI augmentées

La deuxième catégorie est probablement sous-utilisée : les CLIs que vous pouvez installer pour étendre les capacités de votre agent, des outils qui ne font pas partie de la chaîne d'outils de base mais deviennent disponibles dès qu'ils sont installés sur la machine.
Un bon exemple est `gh`, la [GitHub CLI](https://cli.github.com/) officielle. Elle débloque un accès direct aux opérations GitHub depuis le shell. Aucune configuration au-delà de l'installation.

La même logique s'applique à un ensemble d'outils plus large :
- [`agent-browser`](https://github.com/vercel-labs/agent-browser) donne à l'agent la capacité de contrôler un navigateur headless depuis la ligne de commande, utile pour tester, débugger ou naviger dans l'UI d'une app.
- Les CLIs de cloud providers comme [`AWS CLI`](https://github.com/aws/aws-cli) et [`Azure CLI`](https://github.com/Azure/azure-cli?wt.mc_id=developermscom) exposent des centaines d'opérations que l'agent peut enchaîner directement, avec une syntaxe qu'il connaît déjà depuis l'entraînement.
- Des CLI custom construites spécifiquement pour vos projets

Quand utiliser la CLI ? Si un outil a une CLI mature et que l'agent peut s'appuyer sur ses connaissances d'entraînement comme point de départ, **préférez la CLI**. MCP s'impose quand l'outil n'a pas de CLI, quand l'authentification est trop délicate à gérer proprement en shell, ou quand le workflow nécessite un état persistant dans un système externe.

### Les subagents comme workers isolés

Un subagent est un agent "spawné" par l'agent principal pour gérer une sous-tâche délimitée. Il dispose :

- de sa propre fenêtre de contexte
- de son propre accès aux outils
- de son propre scope
- puis retourne un résultat au parent

Du point de vue de la Context-Layer Architecture, cela compte parce que ça déplace le travail hors du contexte principal.
Au lieu de charger une analyse approfondie de la codebase (ou une longue séquence de diagnostic) dans la fenêtre principale, vous déléguez. L'agent parent voit simplement le résultat, pas tout le raisonnement intermédiaire ni les lectures de fichiers qui l'ont produit.
Les bénéfices concrets sont :

- **Isolation :** chaque subagent travaille avec sa propre fenêtre contextuelle et évite ainsi qu'une tâche latérale pollue le contexte principal.
- **Parallélisme :** ils peuvent avancer en même temps sur des tâches indépendantes, comme écrire des tests pour le module A pendant qu'un refactor a lieu sur le module B.

En pratique, la plupart des agents gèrent ça automatiquement. Claude Code, Codex, Kiro et des outils similaires spawnent des subagents quand les tâches le justifient. Vous ne configurez généralement pas cela, mais vous pouvez, si vous le souhaitez, spawner des subagents personnalisés pour des sous-tâches bien définies.

---

## Couche 3 : System Layer (hooks et permissions)

C'est la couche d'enforcement, qui permet de forcer les choses au niveau system. Contrairement à la couche permanente et à la couche on-demand, elle ne repose pas du tout sur le jugement probabiliste du LLM. Elle intercepte l'exécution à des événements de cycle de vie et autorise, bloque, ou transforme les actions avant qu'elles n'atteignent le filesystem ou des systèmes externes. Les permissions et les hooks s'exécutent de manière déterministe. Ils n'oublient jamais les règles quand le contexte est saturé, c'est pourquoi ils constituent la surface d'enforcement la plus fiable de la stack.

### Permissions

Les permissions définissent ce que l'agent est autorisé à faire : accès au filesystem, accès réseau, et commandes CLI whitelistées. Il y a généralement peu à tweaker ici, mais évitez de whitelister des commandes destructives que vous ne voudriez jamais voir s'exécuter sans approbation.

### Hooks : enforcement déterministe

Là où une règle dans `AGENTS.md/CLAUDE.md` peut être ignorée, un hook est une barrière stricte.
Contrairement aux `AGENTS.md/CLAUDE.md`, les hooks ne vivent pas dans le prompt. Ils n'injectent du contenu dans le contexte que quand ils échouent. Cela rend les hooks idéaux pour les règles que vous **ne voulez jamais voir violées**, sans payer un coût contextuel permanent.

#### Types de handlers

Claude Code supporte trois types de handlers :

| Type | What it does | When to use it |
| --- | --- | --- |
| `command` | 	Exécute un script shell | Vérifications structurelles, enforcement, formatage |
| `prompt` | Envoie le contexte au LLM | Quand la décision nécessite une interprétation, pas une règle dure |
| `agent` | Spawn un subagent avec accès aux outils | Vérification approfondie nécessitant l'exploration de la codebase |

Concentrez-vous d'abord sur `command`. Il est déterministe, rapide, n'a aucun coût d'inférence, et couvre la plupart des besoins.

- `PreToolUse` pour valider ou refuser une action avant exécution.
- `PostToolUse` pour le « cleanup », les vérifications ou le « feedback » après exécution.

Utilisez `PreToolUse` pour les **« policy guards »** et `PostToolUse` pour le **« cleanup » et le « feedback »**.

#### Lifecycle events

Les hooks s'attachent à des points spécifiques du cycle d'exécution de l'agent. Claude Code en expose beaucoup, mais deux couvrent la plupart des cas qui nous intéressent :

`PreToolUse`  se déclenche avant que tout outil ne s'exécute. C'est le seul événement qui peut bloquer des actions. Chaque appel d'outil, Bash, Edit, Write, Read, WebFetch, Task, ou tout outil MCP, passe d'abord forcément par ici. Le hook reçoit une payload JSON sur `stdin` avec le nom de l'outil, son input complet, et le contexte de session.
Exit `0` et l'exécution continue. Exit `2` avec un message sur `stderr` et l'action est bloquée, avec un message retourné directement à l'agent.

```bash
INPUT=$(cat)
command=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$command" | grep -qE "(^|[\\s&|;])npm "; then
  echo "Blocked: use pnpm, not npm." >&2
  exit 2
fi
```
`PreToolUse` est donc le parfait candidat pour forcer des politiques strictes sur les opérations irréversibles comme les déploiements en production, les migrations de base de données, et les écritures git.

`PostToolUse`  se déclenche après qu'un outil s'est exécuté avec succès. Il ne peut pas bloquer, mais peut injecter du feedback structuré via `additionalContext`. Le pattern est simple : lancer un quality check, capturer l'output, le retourner à l'agent. Un linter détecte une erreur, la description de l'erreur revient dans le contexte, l'agent la corrige à sa prochaine action. Cela ferme la feedback loop sans aucune intervention humaine.

```bash
FILE=$(echo "$(cat)" | jq -r '.tool_input.file_path // empty')
[[ "$FILE" =~ \.(ts|tsx)$ ]] || exit 0

npx prettier --write "$FILE" 2>/dev/null
if ! npx tsc --noEmit 2>&1 | head -20; then
  echo "Type errors introduced - resolve before proceeding." >&2
fi
```

#### Déplacer les règles strictes hors du `AGENTS.md`

Beaucoup de règles qui encombrent `AGENTS.md/CLAUDE.md` sont en réalité des candidats à l'enforcement, pas au contexte :

<div class="instruction-block">

- “Toujours utiliser pnpm, jamais npm ni yarn.”
- “Ne jamais modifier manuellement les fichiers du dossier `__generated__`.”
- “Tous les commits doivent suivre le format conventional commit.”

</div>

Ce sont des contraintes strictes, pas de la connaissance implicite. La règle `use-pnpm` devient un hook `PreToolUse` qui inspecte chaque commande shell. La protection de `__generated__` devient un contrôle de chemin sur les opérations d'écriture. Le format des commits s'impose sur les outils shell qui invoquent `git commit`.

Déplacer les règles d'« enforcement » hors du contexte permanent et dans les hooks est **l'un des nettoyages les plus rentables que vous puissiez faire**. Cela permet de garder `AGENTS.md/CLAUDE.md` centré sur ce qui a réellement besoin de contexte, et de réserver la couche système à ce qui exige des **garanties absolues**.

---

## Couche 4 : Feedback Layer (tests, lint, type check)

Cette boucle de vérification referme le cycle d'action de l'agent. C'est l'une des couches les moins développées dans beaucoup de setups agentiques, et pourtant l'une des plus importantes à bien construire.

L'agent peut produire quelque chose, annoncer que c'est réussi, et pourtant se tromper. La « feature » peut fonctionner, mais la qualité du code peut rester médiocre. La couche feedback est là pour capter cela. Les tests valident la correction fonctionnelle, le type checking attrape tôt les erreurs structurelles, et le lint impose de la cohérence sans dépendre d'un humain à chaque étape. Ensemble, ces vérifications maintiennent une codebase de qualité et permettent à l'agent d'évoluer de manière plus **« autonome »**.

### Type checking

`tsc --noEmit` est souvent le signal déterministe le plus rapide dans une stack TypeScript. Il connaît vos interfaces, vos exports et les signatures de fonctions. Quand l'agent refactor un utilitaire partagé ou change la forme d'un DTO, `tsc` remonte les ruptures en aval avant même que les tests ou le build ne démarrent.

#### Des règles plus strictes = du signal gratuit

Pour un développeur humain, une config TypeScript stricte peut ressembler à de la friction. Elle ralentit, force des décisions explicites, et fait remonter des erreurs qu'on comptait nettoyer plus tard. Dans le développement agentique, cette logique s'inverse. L'agent n'a pas vraiment de notion de "plus tard". Il produit du code, reçoit un signal, et réagit immédiatement.

Plus le compilateur est strict, plus le signal est riche. Une config `tsconfig` stricte n'est **pas une contrainte pour l'agent**. C'est un **multiplicateur de qualité gratuit** appliqué à tout ce qu'il produit.

Les règles qui valent la peine d'être activées :

- `strict: true` dans `tsconfig.json` est non négociable dans un contexte agentique.
- `noUnusedLocals` et `noUnusedParameters` attrapent les débris de refactor.
- `allowUnreachableCode: false` et `allowUnusedLabels: false` font remonter le dead code dès son introduction.
- `noUncheckedSideEffectImports: true` bloque les imports à effets de bord quand l'existence du module n'est pas vérifiable.
- `noFallthroughCasesInSwitch: true` impose une intention explicite pour chaque `switch`.
- `paths: { "@/*": ["./src/*"] }` n'est pas une règle de validation, mais un contrat structurel.

Un compilateur plus strict ne ralentit pas l'agent. Il lui donne un meilleur signal à chaque fois.

### Linting

#### Le linter est un contrat d'architecture

La même logique qu'avec un `tsconfig` strict s'applique ici. Chaque règle de lint ajoutée est un capteur à zéro token qui se déclenche sur chaque changement produit par l'agent, sans espérer que le modèle se souvienne du bon paragraphe dans `CLAUDE.md`, sans attendre la « review », sans compter sur un humain pour repérer le problème plus tard. La différence, c'est que le type checker impose la correction structurelle. Le linter impose l'intention : décisions d'architecture, conventions d'équipe, « patterns » dépréciés et règles métier que le système de types ne sait pas exprimer.

Un agent qui produit du *code moyen* est souvent un agent qui travaille sans assez de contraintes. Le linter est une manière de **relever le niveau**.

#### La philosophie des « baselines » strictes

Avant d'écrire des règles custom, commencez par une base stricte qui traite les erreurs de lint en échec et non en warnings. Une baseline stricte capte toute une classe d'erreurs typiques des LLM, comme les assertions inutiles, un « error handling » trop large, des « generics » brouillons, des « barrel imports », des « exhaustive checks » manquants, etc., au moment même où elles apparaissent. La qualité devient alors une propriété de l'environnement, pas quelque chose qu'il faut redemander dans un nouveau prompt.

[Ultracite](https://www.ultracite.ai/) est un bon exemple de cette philosophie. C'est un preset de « lint » très « opinionated » qui embarque des centaines de règles sur TypeScript, React, l'accessibilité, les imports et la qualité de code, calibrées pour être strictes sans créer trop de "bruit". Que vous adoptiez Ultracite ou que vous [composiez votre propre équivalent](https://github.com/StephanOrgiazzi/ironoxlint), le principe reste le même : une base stricte remplace une grande partie des allers-retours fastidieux avec l'agent et fournit, dès le départ, un « enforcement » avec un fort « signal-to-noise ratio ».

#### Les limites de taille des fichiers et des fonctions comme garde-fous architecturaux

Les LLM ont tendance à produire des fichiers volumineux et monolithiques. Un utilitaire de 200 lignes devient vite un fichier de 800 lignes au fil des itérations de l'agent. Le problème ne se limite pas à la lisibilité : les performances se dégradent à mesure que le contexte interne d'un fichier grossit. Le modèle dépense davantage de tokens à suivre les références internes, l'état local et la logique imbriquée, et moins sur la tâche elle-même, ce qui rend l'ensemble plus difficile à tester, relire et maintenir.

On peut résoudre cela de manière déterministe avec des règles ESLint/OxLint intégrées qui imposent des limites de taille :

```json
{
  "rules": {
    "max-lines": ["error", { "max": 600, "skipBlankLines": true, "skipComments": true }],
    "max-lines-per-function": ["error", { "max": 250, "skipBlankLines": true, "skipComments": true }]
  }
}
```

Ces contraintes encodent des principes que vous appliqueriez déjà en tant que développeur pour peu que vous teniez à garder une architecture propre et à garantir de bons patterns : composabilité, séparation des responsabilités et unités testables. La différence, c'est qu'une règle de lint les applique automatiquement et immédiatement, en imposant de manière déterministe ce qui demanderait sinon une vigilance constante, sans attendre la review et sans dépendre du jugement du modèle sur le moment. L'agent s'adapte en produisant dès le départ des unités plus petites et plus ciblées, et la codebase reste navigable à mesure qu'elle grandit.

#### Les règles spécifiques au projet sont le vrai levier

Les meilleures règles de linting sont les règles que vous écrivez vous-même, spécifiques à votre codebase, à votre domaine et à la connaissance accumulée par votre équipe.

Chaque décision d'architecture qui vit aujourd'hui comme folklore d'équipe est une règle de lint qui attend d'exister :

<div class="instruction-block">
  <ul>
    <li>“Do not import the database layer from UI components.”</li>
    <li>“Use the internal `httpClient` wrapper, not raw `fetch`.”</li>
    <li>“The payments module cannot import from analytics.”</li>
    <li>“We deprecated `moment`, use `date-fns`.”</li>
  </ul>
</div>

Chacune de ces règles existe aujourd'hui sous forme de commentaire de PR, de section dans un wiki, ou de connaissance tacite dans la tête de quelqu'un. L'agent n'y accèdera jamais de manière fiable, et rien de tout cela ne résiste bien au turnover d'équipe. Transformez-les en règles, et elles deviennent une partie de l'environnement dans lequel l'agent opère.

`no-restricted-imports` est la « primitive » de gouvernance la plus simple :

```json
"no-restricted-imports": ["error", {
  "paths": [
    { "name": "axios", "message": "Use the internal httpClient wrapper instead." },
    { "name": "moment", "message": "Use date-fns. moment is deprecated." }
  ]
}]
```

Pour l'architecture, `eslint-plugin-boundaries` va plus loin. Il permet de déclarer quelles couches peuvent importer depuis quelles autres : UI, domain, infra, shared, et transforme chaque violation en erreur locale immédiate.

Chaque fois qu'un pattern apparaît plus de deux fois en review, demandez-vous s'il peut devenir une règle de lint. Si oui, il devrait probablement le devenir. **Un commentaire de review récurrent est une règle de lint qui attend d'exister**, et dans un workflow agentique, une règle de lint est bien plus fiable qu'un commentaire.

Plus vous encodez de règles spécifiques au projet, plus la sortie de l'agent reflète les vraies exigences de votre codebase plutôt que des moyennes statistiques issues des données d'entraînement. Chaque règle est un capteur supplémentaire. Plus de capteurs veut dire un meilleur signal. Et un meilleur signal veut généralement dire une meilleure sortie.

### Tests

#### Les tests comme signal comportemental

Les tests sont le signal de « feedback » le plus direct dans votre "harness". Le type checker indique à l'agent que le code est structurellement valide, le linter lui dit qu'il respecte les règles, et les tests lui disent si le code *fait réellement ce qu'il est censé faire*.

Écrire des tests était autrefois coûteux et pénible, si bien que certaines équipes se contentaient parfois d'une couverture moyenne de tests passables. La boucle de feedback était limitée par la quantité de "pain points" acceptable.
Aujourd'hui, le coût de la couverture et de la qualité des tests a changé. Vous décrivez le comportement, vous pointez l'agent vers le composant, et il peut proposer rapidement une suite de tests. La conséquence pratique : **les trous dans la couverture de tests sont désormais des trous dans la « feedback loop »**.

Inversement, exiger une couverture complète et des tests de qualité crée un cercle vertueux. Ces tests deviennent des repères tangibles : ils guident l'agent dans ses prochaines modifications et lui permettent d'évoluer avec confiance dans la codebase.
---

## Principe final : la codebase est le meilleur contexte

Une idée centrale traverse tout l'article :

Un `CLAUDE.md` et des skills de qualité, c'est simplement de la bonne documentation. Une configuration TypeScript stricte, c'est ce que les développeurs essaient déjà d'imposer sur chaque codebase. Des règles de lint qui encodent les décisions d'architecture, c'est de la connaissance institutionnelle écrite. Les tests comme « feedback loop » ne sont pas une idée nouvelle, c'est une des idées les plus anciennes de la qualité logicielle.

### Le "harness engineering", c'est simplement du bon engineering

Ce qui est nouveau, c'est le coût de ne pas le faire. Quand un développeur humain passe à côté d'une doc ou écrit un test passable, le manque est souvent compensé par du jugement et de la mémoire institutionnelle. Le système est imparfait, mais il tient généralement.

Un agent n'a rien de tout cela. Chaque trou dans votre harness est un trou dans lequel l'agent tombera, silencieusement, à chaque tâche.

Le paradoxe, c'est qu'une codebase bien conçue n'a presque plus besoin de `CLAUDE.md`.

Les agents sont d'excellents « pattern matchers ». Si les décisions d'architecture et les patterns de code apparaissent de manière cohérente, l'agent n'a pas besoin qu'on lui réécrive les règles à chaque fois. Il peut les lire dans l'environnement.

Les couches de contexte manuelles existent pour compenser les manques. Éliminez les manques, et vous éliminerez l'essentiel de ce que ces fichiers d'AGENTS et de skills avaient besoin de dire.

La discipline que demande le « harness engineering » est la même que celle qu'a toujours demandée le bon engineering : **encoder les décisions pour qu'elles survivent à ceux qui les ont prises, préférer un « enforcement » déterministe à la connaissance tacite, et refermer les « feedback loops » tôt.**

Ce qui change, c'est là où porte votre attention : l'agent écrit le code, et votre travail consiste à reviewer et améliorer l'environnement dans lequel il évolue. La promesse sous-estimée du développement agentique, c'est qu'une codebase bien conçu, soumise à une pression automatisée constante, converge vers la qualité optimale plus vite qu'aucune équipe n'aurait pu le faire manuellement auparavant.

---

## Sources

- [AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Lessons from Building Claude Code: How We Use Skills ](https://x.com/trq212/status/2033949937936085378)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988)
- [Your AGENTS.md Is Just Band-Aid](https://x.com/elmd_/status/2025976479276806294)
- [You Don’t Know Claude Code: Architecture, Governance, and Engineering Practices](https://x.com/HiTw93/status/2033181380432339045)
- [You Don't Know AI Agents: Principles, Architecture, and Engineering Practices](https://x.com/HiTw93/status/2035527178419683540)
- [Claude Code Documentation](https://code.claude.com/docs/en/)
