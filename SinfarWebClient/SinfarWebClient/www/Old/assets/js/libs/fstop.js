// ==UserScript== 
// @name F-Stop
// @namespace none 
// @description The smart profanity filter
// @include * 
// @version 1.0
// @homepage http://fstop.oliveryork.com.au/
// ==/UserScript==
//If you plan on editing this script and publishing your own version line 9 must be included somewhere in your source code somewhere between lines 1 and 40. Based on a script in Mark Pilgram's upcoming "Dive into Greasemonkey" The Jmaxxz Vulgar Word Blocker can be found at: http://userscripts.org/scripts/show/2287 A Special thank you goes to rschultz2002 and Giorgio Maone for their help in the making of this script
(function () {
    var bad = [], badstrings = [], good = [], modifiers = [];
    populate({
        //A
        "ass hole": "nimwit",
        "asshole": "nimwit",
        "ass-hole": "nimwit",
        " ass ": " bottom ",
        " ass!": " bottom!",
        " ass,": " bottom,",
        //B
        "ballsack": "were the sun don't shine",
        "bastard": "illegitimate child",
        "son of a bitch": "spoiled brat",
        "bitchy": "crabby",
        "bitched": "yelled",
        "bitching": "complaining",
        "bitches": "female dogs",
        "bitch": "female dog",
        //C
        "cunt": "idiot",
        //D
        "dickhead": "jerk",
        "douche": "nimwit",
        "douchebag": "nimwit",
        //E
        //F
        "faggot": "bundle of sticks",
        "fucking": "flipping",
        "fuckin": "flippin",
        "fucken": "flippen",
        "fucked": "flipped",
        "fucker": "loser",
        "motherfucker": "jerk",
        "fuck": "flip",
        "wtf": "what the!?",
        //G
        //H
        //I
        //J
        "jackass": "donkey",
        //K
        //L
        "lmao": "rofl",
        "lmfao": "rofl",
        //M
        //N
        //O
        //P
        //Q
        //R
        //S
        "shitty": "crappy",
        "shit": "poo",
        //T
        //U
        //V
        //W
        //X
        //Y
        //Z
    }, "gi");
    function populate(replacements, flags) { var word, modPos, mod; for (var key in replacements) { if ((modPos = key.indexOf("/")) > -1) { mod = key.substring(modPos + 1); word = key.substring(0, modPos) } else { mod = ""; word = key } modifiers.push(mod); bad.push(new RegExp(word, flags)); badstrings.push(word); good.push(replacements[key]) } } function sanitize(s, noContext, notredirect) { for (var j = 0; j < bad.length; j++) { s = s.replace(bad[j], "." + good[j]) } return s } if (document.title) { var temp = sanitize(" " + document.title + " ", false, true); document.title = temp.substring(1, temp.length - 1) } var textnodes = document.evaluate("//body//text()", document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null); for (var i = 0; i < textnodes.snapshotLength; i++) { node = textnodes.snapshotItem(i); node.data = sanitize(" " + node.data + " ", false, true); node.data = node.data.substring(1, node.data.length - 1) }
})();