import { Injectable, ConflictException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUser();
  }

  private async ensureAdminUser() {
    const existing = await this.usersRepository.findOne({ where: { email: 'admin@example.com' } });
    if (existing) {
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = this.usersRepository.create({
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
    });
    await this.usersRepository.save(admin);
  }

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findOne({ where: { email } }) ?? undefined;
  }

  async findById(id: string): Promise<UserEntity | undefined> {
    return this.usersRepository.findOne({ where: { id } }) ?? undefined;
  }

  async findAll(): Promise<Omit<UserEntity, 'password'>[]> {
    const users = await this.usersRepository.find();
    return users.map(({ password, ...user }) => user);
  }

  async create(email: string, password: string, name: string): Promise<Omit<UserEntity, 'password'>> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
    });

    const savedUser = await this.usersRepository.save(newUser);
    const { password: _, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async update(id: string, data: Partial<{ email: string; password: string; name: string }>): Promise<Omit<UserEntity, 'password'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
      user.email = data.email;
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      user.password = hashedPassword;
    }

    if (data.name) {
      user.name = data.name;
    }

    const savedUser = await this.usersRepository.save(user);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword;
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersRepository.delete(id);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
