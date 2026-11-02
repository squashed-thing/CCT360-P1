// ===== Settings =====
var STORAGE_KEY = "curiousCaseV4";
var CODE = "1889";
var HINT_POKES_NEEDED = 5;

// ===== Game state (saved in the browser) =====
var defaultState = {
  page: 0,
  letterRead: false,
  photo: false,
  key: false,
  codeSolved: false,
  sketch: false,
  hintPokes: 0
};

var state = JSON.parse(JSON.stringify(defaultState));

// ===== Story panels =====
// gets  = items the player picks up when they arrive here
// need  = item required to press that button ("vault" needs the code AND the sketch)
// hint  = the cat's hint, unlocked after several pokes (only on panels with a hint)
// finish = this panel is an ending
var pages = [
  {
    image: "image/01-study.png",
    title: "Panel 1: The Study",
    caption: "Edmund Vale, mapmaker, vanished three weeks ago. He left behind a half-eaten sandwich and a very judgmental cat.",
    text: "The room smells like old cheese and unfinished plans. Something is definitely off.",
    choices: [
      { label: "Read the letter", go: 1 },
      { label: "Stare at the portrait", go: 2 },
      { label: "Go to the cellar door", go: 3, need: "key", missing: "The cellar door is locked tighter than a jar of pickles. Find a key first." }
    ]
  },
  {
    image: "image/02-letter.png",
    title: "Panel 2: The Letter",
    caption: "A letter is tucked under a mug that says 'WORLD'S OKAYEST MAPMAKER.'",
    text: "\"The only lock I trust is the year the harbor bell fell into the sea. Do NOT trust the cat.\"",
    gets: ["letterRead"],
    choices: [
      { label: "Stare at the portrait", go: 2 },
      { label: "Back to the study", go: 0 }
    ]
  },
  {
    image: "image/03-portrait.png",
    title: "Panel 3: The Portrait",
    caption: "The portrait has been staring at you for 40 years. It is not impressed.",
    text: "Behind it: a brass key, an old photo, and a sticky note that says 'Sorry about the dust.' On the back of the photo: \"The bell, before it fell. 1889.\"",
    gets: ["photo", "key"],
    choices: [
      { label: "Go to the cellar", go: 3, need: "key", missing: "You need the key first. The cellar is not a suggestion." },
      { label: "Climb the north stairs", go: 4 },
      { label: "Back to the study", go: 0 }
    ]
  },
  {
    image: "image/04-cellar.png",
    title: "Panel 4: The Cellar",
    caption: "An iron vault door with a four-digit lock. It looks like a bank that has never been robbed because nobody can find it.",
    text: "The lock waits patiently. The cat does not.",
    hint: "The letter mentioned the year the harbor bell fell. The photo says that year: 1889.",
    hasCode: true,
    choices: [
      { label: "Go to the vault", go: 5, need: "vault", missing: "The vault is sealed. Open the lock AND sketch the star first." },
      { label: "Climb the north stairs", go: 4 },
      { label: "Back to the study", go: 0 }
    ]
  },
  {
    image: "image/05-observatory.png",
    title: "Panel 5: The Observatory",
    caption: "A telescope, a glass roof, and a stargazer who clearly never comes down.",
    text: "There is a star in view. Look through the telescope to sketch it. Please do not ask the stargazer for directions.",
    choices: [
      { label: "Look through the telescope", go: 4, action: "sketch", message: "You sketch a circled star labeled 'true north.' Your art teacher would cry tears of joy." },
      { label: "Go to the vault", go: 5, need: "vault", missing: "The vault is sealed. Open the lock AND sketch the star first." },
      { label: "Back to the study", go: 0 }
    ]
  },
  {
    image: "image/06-vault.png",
    title: "Panel 6: The Vault",
    caption: "A velvet box, a note, and a tiny plastic dinosaur guarding everything.",
    text: "The note says: \"The map or the truth. Choose what you believe. Snacks are in the second drawer.\"",
    choices: [
      { label: "Leave the box closed (very mature)", go: 6 },
      { label: "Open the box (very curious)", go: 7 }
    ]
  },
  {
    image: "image/07-ending-quiet.png",
    title: "The End: The Responsible Choice",
    caption: "You close the box, pat the dinosaur on the head, and walk out into the evening.",
    text: "You chose restraint. Edmund is probably fine. Probably. The dinosaur gives you a nod of approval.",
    finish: true,
    choices: [
      { label: "Play again", action: "reset" }
    ]
  },
  {
    image: "image/08-ending-open.png",
    title: "The End: The Box Was Mostly Empty",
    caption: "Inside the box: a folded map, one sock, and a fortune cookie.",
    text: "The fortune says: 'Your name is on the back of the map. Also, you owe Edmund a sandwich.'",
    finish: true,
    choices: [
      { label: "Play again", action: "reset" }
    ]
  }
];

// ===== Helpers =====
function $(id) {
  return document.getElementById(id);
}

function hasItem(name) {
  if (name === "vault") {
    return state.codeSolved && state.sketch;
  }
  return state[name] === true;
}

function countClues() {
  var names = ["letterRead", "photo", "key", "codeSolved", "sketch"];
  var n = 0;
  for (var i = 0; i < names.length; i++) {
    if (state[names[i]]) n++;
  }
  return n;
}

function saveGame() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage blocked: the game still works, it just won't remember
  }
}

function loadGame() {
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.page === "number" && pages[saved.page]) {
      state = saved;
    }
  } catch (e) {
    // Bad save: start fresh
  }
  // Fill in any missing fields so older saves still work
  for (var key in defaultState) {
    if (typeof state[key] !== typeof defaultState[key]) {
      state[key] = defaultState[key];
    }
  }
}

// ===== Showing a panel =====
function showPage(n, message) {
  state.page = n;
  var p = pages[n];

  if (p.gets) {
    for (var i = 0; i < p.gets.length; i++) {
      state[p.gets[i]] = true;
    }
  }

  $("panelImage").src = p.image;
  $("panelImage").alt = p.title;
  $("panelTitle").textContent = p.title;
  $("panelCaption").textContent = p.caption;

  var text = p.text;
  if (p.hasCode && state.codeSolved) {
    text += " The lock is open now. The vault door has been left ajar.";
  }
  if (p.finish) {
    text += " (Clues found: " + countClues() + " of 5.)";
  }
  $("panelText").textContent = text;

  $("message").textContent = message || "";
  $("progress").textContent = "Clues found: " + countClues() + " / 5";

  showHintArea(p);

  $("codeArea").style.display = (p.hasCode && !state.codeSolved) ? "block" : "none";
  $("funImage").style.display = p.finish ? "block" : "none";

  showChoices(p);
  showJournal();
  saveGame();
}

function showHintArea(p) {
  var area = $("hintArea");
  area.innerHTML = "";
  if (!p.hint) return;

  if (state.hintPokes < HINT_POKES_NEEDED) {
    var button = document.createElement("button");
    button.textContent = "Poke the cat for a hint (" + state.hintPokes + "/" + HINT_POKES_NEEDED + ")";
    button.onclick = pokeCat;
    area.appendChild(button);
  } else {
    var box = document.createElement("div");
    box.className = "hint-box";
    box.textContent = "Hint: " + p.hint;
    area.appendChild(box);
  }
}

function pokeCat() {
  state.hintPokes++;
  var remaining = HINT_POKES_NEEDED - state.hintPokes;
  var msg;
  if (remaining > 0) {
    msg = "The cat hisses. " + remaining + " more poke" + (remaining === 1 ? "" : "s") + " and it might cooperate.";
  } else {
    msg = "The cat knocks a note off the shelf. Fine, it's yours now.";
  }
  showPage(state.page, msg);
}

function showChoices(p) {
  var box = $("choices");
  box.innerHTML = "";

  for (var i = 0; i < p.choices.length; i++) {
    var c = p.choices[i];
    var locked = c.need && !hasItem(c.need);
    var label = c.label;

    if (c.action === "sketch" && state.sketch) {
      label = "Already sketched the star";
    }
    if (locked) {
      label = "(locked) " + label;
    }

    var button = document.createElement("button");
    button.textContent = label;
    if (locked) {
      button.className = "locked";
    }
    button.onclick = (function (choice) {
      return function () { pickChoice(choice); };
    })(c);
    box.appendChild(button);
  }
}

function pickChoice(c) {
  if (c.action === "reset") {
    resetGame();
    return;
  }

  if (c.need && !hasItem(c.need)) {
    $("message").textContent = c.missing;
    return;
  }

  if (c.action === "sketch") {
    if (state.sketch) {
      $("message").textContent = "You already sketched the star. One is enough.";
      return;
    }
    state.sketch = true;
  }

  showPage(c.go, c.message || "");
}

// ===== The lock =====
function checkCode() {
  var box = $("codeBox");
  var code = box.value.replace(/\D/g, "");
  box.value = "";

  if (code === CODE) {
    state.codeSolved = true;
    showPage(state.page, "CLICK! The lock opens. Inside is a ledger: 'Ada returned the map. I did not.'");
  } else if (code.length < 4) {
    $("message").textContent = "The lock wants four digits. It is not impressed by " + (code.length || "zero") + ".";
  } else {
    $("message").textContent = "The lock makes a sad beep. Wrong code.";
  }
}

// ===== Journal =====
function showJournal() {
  var list = $("journalList");
  list.innerHTML = "";

  var entries = [
    { have: state.letterRead, text: "Letter: 'The only lock I trust is the year the harbor bell fell into the sea.'", blank: "??? A letter (not found yet)" },
    { have: state.photo, text: "Photo: 'The bell, before it fell. 1889.'", blank: "??? A photo (behind the portrait)" },
    { have: state.key, text: "Brass key (smells like cheese)", blank: "??? A key (behind the portrait)" },
    { have: state.codeSolved, text: "Ledger: 'Ada returned the map. I did not.'", blank: "??? The vault lock (solve the cellar)" },
    { have: state.sketch, text: "Star sketch: a circled star labeled 'true north.'", blank: "??? A star sketch (look through the telescope)" }
  ];

  for (var i = 0; i < entries.length; i++) {
    var p = document.createElement("p");
    if (entries[i].have) {
      p.textContent = entries[i].text;
    } else {
      p.textContent = entries[i].blank;
      p.className = "missing";
    }
    list.appendChild(p);
  }

  if (state.hintPokes >= HINT_POKES_NEEDED) {
    var hint = document.createElement("p");
    hint.textContent = "Cat's hint: " + pages[3].hint;
    list.appendChild(hint);
  }
}

// ===== Start over =====
function resetGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  state = JSON.parse(JSON.stringify(defaultState));
  $("codeBox").value = "";
  showPage(0, "The case is reset. The cat is pretending it never happened.");
}

// ===== Set up =====
$("codeBox").addEventListener("keydown", function (e) {
  if (e.key === "Enter") checkCode();
});

loadGame();
showPage(state.page, "");
