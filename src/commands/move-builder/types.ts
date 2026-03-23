import {
  MOVE_BOOST_KEYS,
  MOVE_CATEGORIES,
  MOVE_CONTEST_TYPES,
  MOVE_FLAGS,
  MOVE_STATUS_CODES,
  MOVE_TARGETS,
  MOVE_TYPES,
  MOVE_VOLATILE_STATUSES,
} from "../../moves/spec";

export interface MoveBuilderFormData {
  namespace: string;
  moveName: string;
  fileId: string;
  moveNumber: string;
  accuracyMode: "number" | "always";
  accuracyValue: string;
  basePower: string;
  category: string;
  pp: string;
  priority: string;
  target: string;
  type: string;
  contestType: string;
  selectedFlags: string[];
  status: string;
  volatileStatus: string;
  sideCondition: string;
  boostStat: string;
  boostStages: string;
  recoilNumerator: string;
  recoilDenominator: string;
  drainNumerator: string;
  drainDenominator: string;
  healNumerator: string;
  healDenominator: string;
  critRatio: string;
  multihitMode: "none" | "fixed" | "range";
  multihitValue: string;
  multihitMin: string;
  multihitMax: string;
  forceSwitch: boolean;
  stallingMove: boolean;
  ohko: boolean;
  selfSwitch: "" | "true" | "copyvolatile" | "shedtail";
  selfdestruct: "" | "always" | "ifHit";
  struggleRecoil: boolean;
  mindBlownRecoil: boolean;
  hasCrashDamage: boolean;
  ignoreAbility: boolean;
  ignoreImmunity: boolean;
  ignoreDefensive: boolean;
  ignoreEvasion: boolean;
  secondaryChance: string;
  secondaryStatus: string;
  secondaryVolatileStatus: string;
  secondaryBoostStat: string;
  secondaryBoostStages: string;
}

export const MOVE_BUILDER_DEFAULT_NAMESPACE = "cobblemon";

export const DEFAULT_MOVE_BUILDER_FORM: MoveBuilderFormData = {
  namespace: MOVE_BUILDER_DEFAULT_NAMESPACE,
  moveName: "Custom Move",
  fileId: "custom_move",
  moveNumber: "",
  accuracyMode: "number",
  accuracyValue: "100",
  basePower: "40",
  category: "Physical",
  pp: "15",
  priority: "0",
  target: "normal",
  type: "Normal",
  contestType: "",
  selectedFlags: [],
  status: "",
  volatileStatus: "",
  sideCondition: "",
  boostStat: "",
  boostStages: "",
  recoilNumerator: "",
  recoilDenominator: "",
  drainNumerator: "",
  drainDenominator: "",
  healNumerator: "",
  healDenominator: "",
  critRatio: "",
  multihitMode: "none",
  multihitValue: "",
  multihitMin: "",
  multihitMax: "",
  forceSwitch: false,
  stallingMove: false,
  ohko: false,
  selfSwitch: "",
  selfdestruct: "",
  struggleRecoil: false,
  mindBlownRecoil: false,
  hasCrashDamage: false,
  ignoreAbility: false,
  ignoreImmunity: false,
  ignoreDefensive: false,
  ignoreEvasion: false,
  secondaryChance: "",
  secondaryStatus: "",
  secondaryVolatileStatus: "",
  secondaryBoostStat: "",
  secondaryBoostStages: "",
};

export const MOVE_BUILDER_CATEGORIES = [...MOVE_CATEGORIES] as const;
export const MOVE_BUILDER_TYPES = [...MOVE_TYPES] as const;
export const MOVE_BUILDER_TARGETS = [...MOVE_TARGETS] as const;
export const MOVE_BUILDER_CONTEST_TYPES = [...MOVE_CONTEST_TYPES] as const;
export const MOVE_BUILDER_FLAGS = [...MOVE_FLAGS] as const;
export const MOVE_BUILDER_STATUS_CODES = [...MOVE_STATUS_CODES] as const;
export const MOVE_BUILDER_VOLATILES = [...MOVE_VOLATILE_STATUSES] as const;
export const MOVE_BUILDER_BOOST_KEYS = [...MOVE_BOOST_KEYS] as const;
