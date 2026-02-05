import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  // En producción, usar una base de datos real
  private users: User[] = [
    {
      id: '1',
      email: 'admin@example.com',
      password: '', // Se inicializará en el constructor
      name: 'Admin User',
      createdAt: new Date(),
    },
  ];

  constructor() {
    // Inicializar con usuario admin (password: admin123)
    this.initializeAdminUser();
  }

  private async initializeAdminUser() {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    this.users[0].password = hashedPassword;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.users.find(user => user.email === email);
  }

  async findById(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.users.map(({ password, ...user }) => user);
  }

  async create(email: string, password: string, name: string): Promise<Omit<User, 'password'>> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
    };

    this.users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async update(id: string, data: Partial<{ email: string; password: string; name: string }>): Promise<Omit<User, 'password'>> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('User not found');
    }

    if (data.email) {
      const existingUser = await this.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
      this.users[userIndex].email = data.email;
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      this.users[userIndex].password = hashedPassword;
    }

    if (data.name) {
      this.users[userIndex].name = data.name;
    }

    const { password, ...userWithoutPassword } = this.users[userIndex];
    return userWithoutPassword;
  }

  async delete(id: string): Promise<void> {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundException('User not found');
    }
    this.users.splice(userIndex, 1);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
