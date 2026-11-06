"""The full trailer's beat grid, shared by shots.py and music.py: Saga II and the title theme, both 152 BPM in D minor.

0.00   OPEN   the made opening (teaser.js's tower move) over Saga II's intro; p(Loom): HELLO, UNRUGGABULL.
6.32   MONT   real play on Saga II's verse (4 bars) and chorus (8), two bars a stage, captions in the game's font
25.26  STOP   the music stops: the roof, p(Loom) gives his odds (its own line, from the take)
       GO     LET'S GO!
       TL     the cover, PLAY NOW and jonniepeed.games on the theme's verse, to the end
"""
BEAT = 60 / 152
BAR = 4 * BEAT
OPEN = 4 * BAR                      # Saga II's intro: the made opening
MONT = OPEN                         # its verse and chorus: the play
STOP = MONT + 12 * BAR              # the hard stop on the chorus's last bar line
ODDS = 3.9                          # p(Loom)'s odds line, from the roof take (its recording is 3.62 s) and a breath
GO = STOP + ODDS                    # LET'S GO!
TL = GO + .95                       # the theme's verse, on the cover
END = TL                            # the end card from here
DUR = TL + 4 * BAR
