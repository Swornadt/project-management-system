import { getRepo } from "../shared/db/repositories";
import { users } from "../shared/data/usersData";

async function seedUsers() {
  console.log("Seeding users...");
  try {
    const batch = getRepo.batch();
    const usersCollection = getRepo(User);

    for (const userData of users) {
      const docRef = usersCollection.doc(userData.id);
      batch.set(docRef, {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    await batch.commit();
    console.log("Users seeded successfully.");
  } catch (error) {
    console.error("Error seeding users:", error);
  }
}

seedUsers();

export default seedUsers;
