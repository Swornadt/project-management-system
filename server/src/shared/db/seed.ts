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

    let adminRole = await roleRepo.findOne({
      where: { name: "Admin" },
    });

    if (!adminRole) {
      adminRole = roleRepo.create({
        name: "Admin",
        description:
          "Full system access; users, roles, content and settings",
      });

      await roleRepo.save(adminRole);
    }

    let managerRole = await roleRepo.findOne({
      where: { name: "Manager" },
    });

    if (!managerRole) {
      managerRole = roleRepo.create({
        name: "Manager",
        description:
          "Manage/review assigned content and users according to permissions",
      });

      await roleRepo.save(managerRole);
    }

    let employeeRole = await roleRepo.findOne({
      where: { name: "Employee" },
    });

    if (!employeeRole) {
      employeeRole = roleRepo.create({
        name: "Employee",
        description:
          "Create/update assigned content, upload files and submit for review",
      });

      await roleRepo.save(employeeRole);
    }

    console.log("Default roles verified.");

    let adminUser = await userRepo.findOne({
      where: { email: "admin@example.com" },
    });

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    if (!adminUser) {
      adminUser = userRepo.create({
        role_id: adminRole.role_id,
        first_name: "System",
        last_name: "Administrator",
        email: "admin@example.com",
        password_hash: hashedPassword,
        status: "active",
        email_verified: true,
      });

      await userRepo.save(adminUser);

      console.log(
        "Default admin created: Email: admin@example.com, Password: Admin@123"
      );
    } else {
      adminUser.role_id = adminRole.role_id;
      adminUser.password_hash = hashedPassword;
      adminUser.status = "active";
      adminUser.email_verified = true;

      await userRepo.save(adminUser);

      console.log(
        "Existing admin updated: Email: admin@example.com, Password: Admin@123"
      );
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
