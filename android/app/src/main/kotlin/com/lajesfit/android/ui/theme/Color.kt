package com.lajesfit.android.ui.theme

import androidx.compose.ui.graphics.Color

// Paleta espelhada do app web (../../src/styles.css). Cada valor deriva de um
// token oklch do web, convertido para sRGB. O web e monocromatico laranja +
// marrom queimado: sem verde/azul como acento (verde so em "success").

// --- Marca ---
val LajesFitOrange = Color(0xFFE76F2E)        // --primary  oklch(.68 .21 42)
val LajesFitOrangeGlow = Color(0xFFF79A4E)    // --primary-glow oklch(.76 .19 55)
val LajesFitAmber = Color(0xFF7C4429)         // --secondary oklch(.38 .12 35) marrom queimado
val LajesFitClay = Color(0xFF8A4F32)          // marrom/argila (no lugar do azul terciario)

// --- Light (web :root) ---
val LajesFitBackground = Color(0xFFFDFBF7)    // --background oklch(.985 .008 60) quase-branco morno
val LajesFitInk = Color(0xFF2C2119)           // --foreground oklch(.22 .04 35)
val LajesFitCard = Color(0xFFFFFFFF)          // --card oklch(1 0 0) branco puro
val LajesFitMuted = Color(0xFFF0EBE3)         // --muted oklch(.95 .015 55)
val LajesFitMutedInk = Color(0xFF7E6C5E)      // --muted-foreground oklch(.48 .04 40)
val LajesFitAccent = Color(0xFFF6E2CE)        // --accent oklch(.92 .06 55)
val LajesFitAccentInk = Color(0xFF452A1B)     // --accent-foreground oklch(.28 .08 35)
val LajesFitBorder = Color(0xFFE7DFD6)        // --border oklch(.9 .015 50)
val LajesFitSurfaceHigh = Color(0xFFF7F2EC)   // topo do ramp de containers (bem claro)
val LajesFitSurfaceHighest = Color(0xFFF2ECE4)

// Semantica compartilhada com o web
val LajesFitDestructive = Color(0xFFD23F2A)   // --destructive oklch(.58 .22 25)
val LajesFitSuccess = Color(0xFF3E9B63)       // --success oklch(.62 .16 145)

// --- Dark (web .dark) ---
val LajesFitOrangeDark = Color(0xFFF0854C)    // --primary oklch(.72 .2 45)
val LajesFitAmberDark = Color(0xFF543424)     // --secondary oklch(.3 .08 35)
val LajesFitClayDark = Color(0xFFC98A63)
val LajesFitDarkBackground = Color(0xFF211A15) // --background oklch(.16 .025 35)
val LajesFitDarkCard = Color(0xFF2F251E)       // --card oklch(.22 .035 35)
val LajesFitDarkInk = Color(0xFFF5EFE8)        // --foreground oklch(.96 .012 55)
val LajesFitDarkMuted = Color(0xFF362C25)      // --muted oklch(.26 .03 35)
val LajesFitDarkMutedInk = Color(0xFFB2A192)   // --muted-foreground oklch(.68 .04 50)
val LajesFitDarkBorder = Color(0xFF40352C)     // --border oklch(.3 .04 35)
val LajesFitDarkSurfaceHigh = Color(0xFF382D25)
val LajesFitDarkSurfaceHighest = Color(0xFF43362C)
