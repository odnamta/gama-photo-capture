import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Unit tests for project configuration
 * Validates: Requirements 1.2, 1.4, 1.5
 */
describe('Project Configuration', () => {
  describe('tsconfig.json', () => {
    it('should have strict mode enabled (Requirement 1.2)', () => {
      const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json')
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8')
      const tsconfig = JSON.parse(tsconfigContent)

      expect(tsconfig.compilerOptions.strict).toBe(true)
    })

    it('should have TypeScript compiler options configured', () => {
      const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json')
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8')
      const tsconfig = JSON.parse(tsconfigContent)

      expect(tsconfig.compilerOptions).toBeDefined()
      expect(tsconfig.compilerOptions.target).toBeDefined()
      expect(tsconfig.compilerOptions.module).toBeDefined()
    })

    it('should have path aliases configured for @ imports', () => {
      const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json')
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8')
      const tsconfig = JSON.parse(tsconfigContent)

      expect(tsconfig.compilerOptions.paths).toBeDefined()
      expect(tsconfig.compilerOptions.paths['@/*']).toContain('./*')
    })
  })

  describe('components.json', () => {
    it('should have new-york style configured (Requirement 1.4)', () => {
      const componentsPath = path.resolve(process.cwd(), 'components.json')
      const componentsContent = fs.readFileSync(componentsPath, 'utf-8')
      const components = JSON.parse(componentsContent)

      expect(components.style).toBe('new-york')
    })

    it('should have shadcn/ui schema reference', () => {
      const componentsPath = path.resolve(process.cwd(), 'components.json')
      const componentsContent = fs.readFileSync(componentsPath, 'utf-8')
      const components = JSON.parse(componentsContent)

      expect(components.$schema).toBe('https://ui.shadcn.com/schema.json')
    })

    it('should have RSC (React Server Components) enabled', () => {
      const componentsPath = path.resolve(process.cwd(), 'components.json')
      const componentsContent = fs.readFileSync(componentsPath, 'utf-8')
      const components = JSON.parse(componentsContent)

      expect(components.rsc).toBe(true)
    })

    it('should have TSX enabled', () => {
      const componentsPath = path.resolve(process.cwd(), 'components.json')
      const componentsContent = fs.readFileSync(componentsPath, 'utf-8')
      const components = JSON.parse(componentsContent)

      expect(components.tsx).toBe(true)
    })

    it('should have correct component aliases configured', () => {
      const componentsPath = path.resolve(process.cwd(), 'components.json')
      const componentsContent = fs.readFileSync(componentsPath, 'utf-8')
      const components = JSON.parse(componentsContent)

      expect(components.aliases).toBeDefined()
      expect(components.aliases.components).toBe('@/components')
      expect(components.aliases.utils).toBe('@/lib/utils')
      expect(components.aliases.ui).toBe('@/components/ui')
    })
  })

  describe('package.json', () => {
    it('should have dev script using port 3001 (Requirement 1.5)', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.scripts.dev).toContain('-p 3001')
    })

    it('should have correct project name', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.name).toBe('gama-photo-capture')
    })

    it('should have Next.js as a dependency', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.dependencies.next).toBeDefined()
    })

    it('should have React and React DOM as dependencies', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.dependencies.react).toBeDefined()
      expect(packageJson.dependencies['react-dom']).toBeDefined()
    })

    it('should have TypeScript as a dev dependency', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.devDependencies.typescript).toBeDefined()
    })

    it('should have TailwindCSS as a dev dependency', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.devDependencies.tailwindcss).toBeDefined()
    })

    it('should have build script configured', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.scripts.build).toBe('next build')
    })

    it('should have lint script configured', () => {
      const packagePath = path.resolve(process.cwd(), 'package.json')
      const packageContent = fs.readFileSync(packagePath, 'utf-8')
      const packageJson = JSON.parse(packageContent)

      expect(packageJson.scripts.lint).toBe('next lint')
    })
  })
})
