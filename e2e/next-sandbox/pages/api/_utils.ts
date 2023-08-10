const FAKE_USERS = [
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
];

type User = {
  id: number;
  name: string;
};

export function randomUser(): User {
  const index = Math.floor(Math.random() * FAKE_USERS.length);
  const user = {
    id: index + 1,
    name: FAKE_USERS[index],
  };
  return user;
}
