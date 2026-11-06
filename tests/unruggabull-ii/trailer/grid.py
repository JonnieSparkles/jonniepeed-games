"""The full trailer's beat grid, shared by shots.py and music.py.

0.00   OPEN   the made opening (teaser.js's tower move) over Saga II's intro (152 BPM); p(Loom): HELLO, UNRUGGABULL.
6.32   MONT   real play on Saga II heavy (the roof's last phase, 170 BPM): its chorus (8 bars) and a verse (4), one
              whole moment a shot, cut after it lands
23.26  STOP   the music stops: the roof, p(Loom) gives his odds (its own line, from the take)
       GO     LET'S GO!
       TL     the cover, PLAY NOW and jonniepeed.games on the title theme's verse (152), to the end
"""
BEAT = 60 / 152                     # the intro's and the theme's
BAR = 4 * BEAT
HBEAT = 60 / 170                    # Saga II heavy's
HBAR = 4 * HBEAT
OPEN = 4 * BAR                      # Saga II's intro: the made opening
MONT = OPEN                         # Saga II heavy: the play
STOP = MONT + 12 * HBAR             # the hard stop on the verse's last bar line
ODDS = 3.9                          # p(Loom)'s odds line, from the roof take (its recording is 3.62 s) and a breath
GO = STOP + ODDS                    # LET'S GO!
TL = GO + .95                       # the theme's verse, on the cover
END = TL                            # the end card from here
DUR = TL + 4 * BAR
