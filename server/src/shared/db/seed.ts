import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Role } from "../../entities/role.entity";
import bcrypt from "bcryptjs";
import { User } from "../../entities/user.entity";

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log("Connected to database for seeding.");

    const roleRepo = AppDataSource.getRepository(Role);
    const userRepo = AppDataSource.getRepository(User);

    const existingRoles = await roleRepo.count();
    if (existingRoles === 0) {
      const adminRole = roleRepo.create({
        name: "Admin",
        description: "Full system access; users, roles, content and settings",
      });
      const managerRole = roleRepo.create({
        name: "Manager",
        description:
          "Manage/review assigned content and users according to permissions",
      });
      const employeeRole = roleRepo.create({
        name: "Employee",
        description:
          "Create/update assigned content, upload files and submit for review",
      });

      await roleRepo.save([adminRole, managerRole, employeeRole]);
      console.log("Default roles seeded: Admin, Manager, Employee");

      const existingUsers = await userRepo.count();
      if (existingUsers === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const adminUser = userRepo.create({
          role_id: adminRole.role_id,
          first_name: "System",
          last_name: "Administrator",
          email: "admin@example.com",
          password_hash: hashedPassword,
          status: "active",
        });
        await userRepo.save(adminUser);
        console.log(
          "Default admin created: Email: admin@example.com, Password: admin123"
        );
      }
    } else {
      console.log("Roles already exist, skipping seed.");
    }

    await AppDataSource.destroy();
    console.log("Seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
