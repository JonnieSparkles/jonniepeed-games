// Replaceable D-minor candidates. Plain track objects; load before audio.js.
// A/B are four-bar patterns, ordered for 30–60 seconds before the loop.
window.UnrugRoofMusic = {
  "roofA": {
    "name": "Driving chip-metal",
    "key": "Dm",
    "bpm": 160,
    "swing": 0,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.07,
            "notes": "D5 . D5 . F5 - A5 - G5 - F5 . E5 - D5 - | Bb4 - D5 . F5 - D5 . C5 - Bb4 . A4 - F4 - | G4 . Bb4 . D5 - G5 - F5 - D5 . Bb4 - G4 - | A4 . C#5 . E5 - G5 - E5 . C#5 . A4 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 G1 . G1 G1 G2 . G1 G1 G1 . G1 G1 G2 . G1 G1 A1 . A1 A1 A2 . A1 A1 A1 . A1 A1 A2 . A1 A1"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.07,
            "notes": "A5 - F5 . D5 . F5 . G5 - A5 - C6 - A5 - | Bb5 - A5 - F5 - D5 - F5 . G5 . A5 - F5 - | G5 - D5 . G5 . Bb5 - A5 - G5 . F5 - D5 - | E5 . C#5 . A4 - C#5 - E5 . G5 . A5 - D6 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 G1 . G1 G1 G2 . G1 G1 G1 . G1 G1 G2 . G1 G1 A1 . A1 A1 A2 . A1 A1 A1 . A1 A1 A2 . A1 A1"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h k . h h s . h h"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 160,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  },
  "roofAHeavy": {
    "name": "Driving chip-metal — heavy",
    "key": "Dm",
    "bpm": 180,
    "swing": 0,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power",
      "heavy"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.09,
            "notes": "D5 . D5 . F5 - A5 - G5 - F5 . E5 - D5 - | Bb4 - D5 . F5 - D5 . C5 - Bb4 . A4 - F4 - | G4 . Bb4 . D5 - G5 - F5 - D5 . Bb4 - G4 - | A4 . C#5 . E5 - G5 - E5 . C#5 . A4 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 G1 . G1 G1 G2 . G1 G1 G1 . G1 G1 G2 . G1 G1 A1 . A1 A1 A2 . A1 A1 A1 . A1 A1 A2 . A1 A1"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "D5 . D5 . F5 - A5 - G5 - F5 . E5 - D5 - | Bb4 - D5 . F5 - D5 . C5 - Bb4 . A4 - F4 - | G4 . Bb4 . D5 - G5 - F5 - D5 . Bb4 - G4 - | A4 . C#5 . E5 - G5 - E5 . C#5 . A4 - D5 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.09,
            "notes": "A5 - F5 . D5 . F5 . G5 - A5 - C6 - A5 - | Bb5 - A5 - F5 - D5 - F5 . G5 . A5 - F5 - | G5 - D5 . G5 . Bb5 - A5 - G5 . F5 - D5 - | E5 . C#5 . A4 - C#5 - E5 . G5 . A5 - D6 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 . D2 D2 D3 . D2 D2 D2 . D2 D2 D3 . D2 D2 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 Bb1 . Bb1 Bb1 Bb2 . Bb1 Bb1 G1 . G1 G1 G2 . G1 G1 G1 . G1 G1 G2 . G1 G1 A1 . A1 A1 A2 . A1 A1 A1 . A1 A1 A2 . A1 A1"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "A5 - F5 . D5 . F5 . G5 - A5 - C6 - A5 - | Bb5 - A5 - F5 - D5 - F5 . G5 . A5 - F5 - | G5 - D5 . G5 . Bb5 - A5 - G5 . F5 - D5 - | E5 . C#5 . A4 - C#5 - E5 . G5 . A5 - D6 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 160,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  },
  "roofB": {
    "name": "Dark synthwave",
    "key": "Dm",
    "bpm": 126,
    "swing": 0.08,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.07,
            "notes": "D5 - - - A4 - D5 - F5 - - - E5 - D5 - | F5 - - - D5 - C5 - Bb4 - - - A4 - F4 - | G4 - - - D5 - G5 - F5 - - - D5 - Bb4 - | E5 - - - C#5 - A4 - E5 - - - C#5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.27,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 - D3 - D2 - D3 - D2 - D3 - D2 - D3 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 - A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.07,
            "notes": "A5 - - - G5 - F5 - E5 - - - D5 - F5 - | F5 - - - A5 - F5 - D5 - - - C5 - Bb4 - | Bb5 - - - A5 - G5 - F5 - - - D5 - G5 - | G5 - - - E5 - C#5 - A4 - - - C#5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.27,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 - D3 - D2 - D3 - D2 - D3 - D2 - D3 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 - A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h k . h . s . h . k . h . s . h h"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 126,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  },
  "roofBHeavy": {
    "name": "Dark synthwave — heavy",
    "key": "Dm",
    "bpm": 142,
    "swing": 0.08,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power",
      "heavy"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.09,
            "notes": "D5 - - - A4 - D5 - F5 - - - E5 - D5 - | F5 - - - D5 - C5 - Bb4 - - - A4 - F4 - | G4 - - - D5 - G5 - F5 - - - D5 - Bb4 - | E5 - - - C#5 - A4 - E5 - - - C#5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.27,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 - D3 - D2 - D3 - D2 - D3 - D2 - D3 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 - A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "D5 - - - A4 - D5 - F5 - - - E5 - D5 - | F5 - - - D5 - C5 - Bb4 - - - A4 - F4 - | G4 - - - D5 - G5 - F5 - - - D5 - Bb4 - | E5 - - - C#5 - A4 - E5 - - - C#5 - D5 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.09,
            "notes": "A5 - - - G5 - F5 - E5 - - - D5 - F5 - | F5 - - - A5 - F5 - D5 - - - C5 - Bb4 - | Bb5 - - - A5 - G5 - F5 - - - D5 - G5 - | G5 - - - E5 - C#5 - A4 - - - C#5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.27,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 - D3 - D2 - D3 - D2 - D3 - D2 - D3 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - Bb1 - Bb2 - G1 - G2 - G1 - G2 - G1 - G2 - G1 - G2 - A1 - A2 - A1 - A2 - A1 - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.018,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 0,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "A5 - - - G5 - F5 - E5 - - - D5 - F5 - | F5 - - - A5 - F5 - D5 - - - C5 - Bb4 - | Bb5 - - - A5 - G5 - F5 - - - D5 - G5 - | G5 - - - E5 - C#5 - A4 - - - C#5 - D5 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 126,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  },
  "roofC": {
    "name": "Epic chip choir",
    "key": "Dm",
    "bpm": 140,
    "swing": 0,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.07,
            "notes": "D5 - - F5 - - A5 - G5 - F5 - E5 - D5 - | F5 - - D5 - - F5 - Bb5 - A5 - G5 - F5 - | G5 - - D5 - - G5 - Bb5 - A5 - G5 - F5 - | E5 - - C#5 - - E5 - A5 - G5 - E5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 - - D3 - D2 - D2 - - D3 - D2 - D3 - Bb1 - - Bb2 - Bb1 - Bb1 - - Bb2 - Bb1 - Bb2 - G1 - - G2 - G1 - G1 - - G2 - G1 - G2 - A1 - - A2 - A1 - A1 - - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h ."
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.022,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": -5,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "choir": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.023,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 5,
            "envelope": {
              "attack": 0.12,
              "decay": 0.15,
              "sustain": 0.6,
              "release": 0.2
            }
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.07,
            "notes": "D6 - - - C6 - Bb5 - A5 - - F5 - - D5 - | F6 - - - D6 - C6 - Bb5 - - A5 - - F5 - | G5 - - - Bb5 - D6 - C6 - - Bb5 - - G5 - | A5 - - - G5 - E5 - C#5 - - E5 - - D6 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.22,
            "gate": 0.76,
            "notes": "D2 - - D3 - D2 - D2 - - D3 - D2 - D3 - Bb1 - - Bb2 - Bb1 - Bb1 - - Bb2 - Bb1 - Bb2 - G1 - - G2 - G1 - G1 - - G2 - G1 - G2 - A1 - - A2 - A1 - A1 - - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.5,
            "notes": "K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h . K . . . S . h ."
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.022,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": -5,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.022,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "choir": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.023,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 5,
            "envelope": {
              "attack": 0.12,
              "decay": 0.15,
              "sustain": 0.6,
              "release": 0.2
            }
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 140,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  },
  "roofCHeavy": {
    "name": "Epic chip choir — heavy",
    "key": "Dm",
    "bpm": 158,
    "swing": 0,
    "loop": 0,
    "order": [
      "A",
      "A",
      "B",
      "B",
      "A",
      "B"
    ],
    "stems": [
      "drums",
      "bass",
      "lead",
      "harmony",
      "power",
      "heavy"
    ],
    "patterns": {
      "A": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.09,
            "notes": "D5 - - F5 - - A5 - G5 - F5 - E5 - D5 - | F5 - - D5 - - F5 - Bb5 - A5 - G5 - F5 - | G5 - - D5 - - G5 - Bb5 - A5 - G5 - F5 - | E5 - - C#5 - - E5 - A5 - G5 - E5 - D5 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 - - D3 - D2 - D2 - - D3 - D2 - D3 - Bb1 - - Bb2 - Bb1 - Bb1 - - Bb2 - Bb1 - Bb2 - G1 - - G2 - G1 - G1 - - G2 - G1 - G2 - A1 - - A2 - A1 - A1 - - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.022,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": -5,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "choir": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.023,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 5,
            "envelope": {
              "attack": 0.12,
              "decay": 0.15,
              "sustain": 0.6,
              "release": 0.2
            }
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "D5 - - F5 - - A5 - G5 - F5 - E5 - D5 - | F5 - - D5 - - F5 - Bb5 - A5 - G5 - F5 - | G5 - - D5 - - G5 - Bb5 - A5 - G5 - F5 - | E5 - - C#5 - - E5 - A5 - G5 - E5 - D5 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      },
      "B": {
        "bars": 4,
        "channels": {
          "pulse1": {
            "stem": "lead",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.09,
            "notes": "D6 - - - C6 - Bb5 - A5 - - F5 - - D5 - | F6 - - - D6 - C6 - Bb5 - - A5 - - F5 - | G5 - - - Bb5 - D6 - C6 - - Bb5 - - G5 - | A5 - - - G5 - E5 - C#5 - - E5 - - D6 -",
            "vibrato": {
              "rate": 5.5,
              "depth": 0.007,
              "delay": 0.12
            },
            "echo": {
              "delay": 0.18,
              "feedback": 0.23,
              "repeats": 2
            }
          },
          "bass": {
            "stem": "bass",
            "wave": "triangle",
            "vol": 0.26,
            "gate": 0.76,
            "notes": "D2 - - D3 - D2 - D2 - - D3 - D2 - D3 - Bb1 - - Bb2 - Bb1 - Bb1 - - Bb2 - Bb1 - Bb2 - G1 - - G2 - G1 - G1 - - G2 - G1 - G2 - A1 - - A2 - A1 - A1 - - A2 - A1 - A2 -"
          },
          "drums": {
            "stem": "drums",
            "wave": "noise",
            "vol": 0.65,
            "notes": "K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H K h h H S . h H"
          },
          "pulse2": {
            "stem": "harmony",
            "wave": "pulse",
            "duty": 0.125,
            "vol": 0.022,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": -5,
            "envelope": {
              "attack": 0.08,
              "decay": 0.2,
              "sustain": 0.55,
              "release": 0.18
            }
          },
          "arpeggio": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.5,
            "vol": 0.03,
            "gate": 0.5,
            "notes": "D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 Bb2 F3 Bb3 F3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 G2 D3 G3 D3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3 A2 E3 A3 E3"
          },
          "choir": {
            "stem": "power",
            "wave": "pulse",
            "duty": 0.25,
            "vol": 0.023,
            "notes": [
              {
                "note": "D4",
                "chord": [
                  "F4",
                  "A4"
                ],
                "len": 16
              },
              {
                "note": "Bb3",
                "chord": [
                  "D4",
                  "F4"
                ],
                "len": 16
              },
              {
                "note": "G3",
                "chord": [
                  "Bb3",
                  "D4"
                ],
                "len": 16
              },
              {
                "note": "A3",
                "chord": [
                  "C#4",
                  "E4"
                ],
                "len": 16
              }
            ],
            "detune": 5,
            "envelope": {
              "attack": 0.12,
              "decay": 0.15,
              "sustain": 0.6,
              "release": 0.2
            }
          },
          "saw": {
            "stem": "heavy",
            "wave": "sawtooth",
            "vol": 0.042,
            "notes": "D6 - - - C6 - Bb5 - A5 - - F5 - - D5 - | F6 - - - D6 - C6 - Bb5 - - A5 - - F5 - | G5 - - - Bb5 - D6 - C6 - - Bb5 - - G5 - | A5 - - - G5 - E5 - C#5 - - E5 - - D6 -",
            "envelope": {
              "attack": 0.004,
              "decay": 0.07,
              "sustain": 0.6,
              "release": 0.05
            },
            "slide": {
              "semitones": -1,
              "seconds": 0.035
            }
          }
        }
      }
    },
    "stingers": {
      "spool": {
        "bpm": 140,
        "wave": "pulse",
        "duty": 0.25,
        "vol": 0.065,
        "notes": "D5 F5 A5 D6 - - . .",
        "echo": {
          "delay": 0.13,
          "feedback": 0.2,
          "repeats": 1
        }
      }
    }
  }
};
