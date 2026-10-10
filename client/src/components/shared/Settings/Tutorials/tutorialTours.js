const WALLET_TOUR_KEY = "ambrosia:tour:wallet-channel";
const WALLET_GUARD_TOUR_KEY = "ambrosia:tour:wallet-guard";
const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";
const SEED_TOUR_KEY = "ambrosia:tour:seed";
const SEED_SETTINGS_TOUR_KEY = "ambrosia:tour:seed-settings";
const SEED_SEEN_KEY = "ambrosia:tour:seed-seen";

export const SEED_TOUR_SEEN_EVENT = "seed-tour:seen";

export const TUTORIAL_TOUR = {
  WALLET: "wallet",
  SEED: "seed",
};

export const TUTORIAL_TOUR_DEFINITIONS = {
  [TUTORIAL_TOUR.WALLET]: {
    translationKey: "walletTour",
    isSeen: () => localStorage.getItem(WALLET_TOUR_KEY) === "visited",
    resetProgress: () => {
      localStorage.removeItem(WALLET_GUARD_TOUR_KEY);
      localStorage.removeItem(WALLET_RECEIVE_TOUR_KEY);
      localStorage.setItem(WALLET_TOUR_KEY, "true");
      localStorage.setItem(SEED_TOUR_KEY, "true");
    },
  },
  [TUTORIAL_TOUR.SEED]: {
    translationKey: "seedTour",
    isSeen: () => Boolean(localStorage.getItem(SEED_SEEN_KEY)),
    resetProgress: () => {
      localStorage.removeItem(SEED_TOUR_KEY);
      localStorage.removeItem(SEED_SETTINGS_TOUR_KEY);
    },
  },
};
