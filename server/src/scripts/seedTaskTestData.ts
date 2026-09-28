// Dev-only helper: creates a Manager + an Employee test user (already
// email-verified, so you can log in immediately) plus one Project and a
// ProjectMember row, so you have real IDs to hit the /tasks endpoints with.
// Run once with: npx tsx src/scripts/seedTaskTestData.ts
//
// Safe to re-run — it skips anything that already exists by email/name.
import "reflect-metadata";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../shared/db/data-source";
import { Role } from "../entities/role.entity";
import { User } from "../entities/user.entity";
import { Project } from "../entities/project.entity";
import { ProjectMember } from "../entities/project-member.entity";

async function upsertUser(
  email: string,
  firstName: string,
  lastName: string,
  roleId: string
): Promise<User> {
  const userRepo = AppDataSource.getRepository(User);
  const existing = await userRepo.findOne({ where: { email } });
  if (existing) return existing;

  const user = userRepo.create({
    role_id: roleId,
    first_name: firstName,
    last_name: lastName,
    email,
    password_hash: await bcrypt.hash("password123", 10),
    status: "active",
    email_verified: true, // skip the email-verification flow for local testing
  });
  return userRepo.save(user);
}

async function main() {
  await AppDataSource.initialize();
  console.log("Connected to database.");

  const roleRepo = AppDataSource.getRepository(Role);
  const managerRole = await roleRepo.findOne({ where: { name: "Manager" } });
  const employeeRole = await roleRepo.findOne({ where: { name: "Employee" } });

  if (!managerRole || !employeeRole) {
    throw new Error("Roles not found — run `npm run seed` first to create Admin/Manager/Employee.");
  }

  const manager = await upsertUser(
    "manager@example.com",
    "Test",
    "Manager",
    managerRole.role_id
  );
  const employee = await upsertUser(
    "employee@example.com",
    "Test",
    "Employee",
    employeeRole.role_id
  );
  console.log(`Manager: manager@example.com / password123 (${manager.user_id})`);
  console.log(`Employee: employee@example.com / password123 (${employee.user_id})`);

  const projectRepo = AppDataSource.getRepository(Project);
  let project = await projectRepo.findOne({ where: { name: "Task Feature Test Project" } });
  if (!project) {
    project = projectRepo.create({
      owner_id: manager.user_id,
      name: "Task Feature Test Project",
      description: "Seeded for manually testing the tasks API",
      status: "active",
    });
    project = await projectRepo.save(project);
  }
  console.log(`Project: ${project.name} (${project.project_id})`);

  const memberRepo = AppDataSource.getRepository(ProjectMember);
  const existingMembership = await memberRepo.findOne({
    where: { project_id: project.project_id, user_id: employee.user_id },
  });
  if (!existingMembership) {
    await memberRepo.save(
      memberRepo.create({
        project_id: project.project_id,
        user_id: employee.user_id,
        role: "member",
      })
    );
  }
  console.log("Employee added as a project member.");

  await AppDataSource.destroy();
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
