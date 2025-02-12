export const FAKE_USERS = [
  "Adri G.",
  "Alicia H.",
  "Chris N.",
  "Florent L.",
  "Guillaume S.",
  "Jonathan R.",
  "Marc B.",
  "Nimesh N.",
  "Olivier F.",
  "Pierre L.",
  "Steven F.",
  "Vincent D.",
  "Aurélien D. D.",
];

type User = {
  id: number;
  name: string;
};

export function getUser(id: number): User {
  if (!(id >= 1 && id <= FAKE_USERS.length)) {
    throw new Error("out of bounds");
  }

  const index = id - 1;
  const user = {
    id,
    name: FAKE_USERS[index],
  };
  return user;
}

export function randomUser(): User {
  const id = Math.floor(Math.random() * FAKE_USERS.length) + 1;
  return getUser(id);
}
