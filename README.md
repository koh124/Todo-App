# React ToDo App

A modern todo application built with React, TypeScript, Vite, and Contentful CMS.

## Demo

Visit the live application: [https://d3kporeqgc8lhr.cloudfront.net](https://d3kporeqgc8lhr.cloudfront.net)

## Features

- Create, update, and delete tasks
- Mark tasks as complete/incomplete
- Filter tasks by status (all/active/completed)
- Pagination for better organization
- Responsive design for all devices
- Optimistic UI updates for better user experience
- Error handling with recovery mechanisms
- Contentful CMS for content management

## Technologies

- **Frontend**: React 19, TypeScript, CSS
- **Build Tool**: Vite 6
- **CMS**: Contentful Headless CMS
- **Infrastructure**: AWS (S3, CloudFront), Terraform
- **CI/CD**: Automated deployment workflows

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Contentful account [(https://www.contentful.com/)](https://www.contentful.com/)


### Environment Variables

Create a `.env` file in the root directory with these variables:

```
VITE_CONTENTFUL_SPACE_ID=your_space_id
VITE_CONTENTFUL_DELIVERY_TOKEN=your_delivery_token
VITE_CONTENTFUL_MANAGEMENT_TOKEN=your_management_token
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```
3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open `http://localhost:5173` in your browser

## Contentful Setup

1. Create a Contentful space
2. Create a content model named `todo` with the following fields:
   - `title` (Text) - The task text
   - `completed` (Boolean) - Task completion status
   - `createdAt` (Date) - Task creation date

## Build for Production

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Infrastructure

The application is deployed using:
- AWS CloudFront for content delivery
- Contentful CMS for content management

## Infrastructure as Code

This project uses Terraform to provision and manage cloud infrastructure:

### AWS Resources Managed by Terraform

- S3 bucket for static website hosting
- CloudFront distribution for content delivery
- IAM policies for secure access control
- Origin Access Control for S3 bucket security

### Terraform Usage

```bash
# Initialize Terraform
cd terraform
terraform init

# Plan deployment
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure when no longer needed
terraform destroy
```

The Terraform configuration creates a secure hosting environment with:
- Private S3 bucket with no public access
- CloudFront distribution with HTTPS enforcement
- SPA routing support via custom error responses
- Optimized cache settings for performance

## CI/CD Workflows

The project includes automated workflows for continuous integration and delivery:

### Development Workflow

1. Develop locally with hot reloading
2. Commit changes to feature branches
3. Open pull requests for code review
4. Automated testing runs on pull requests
5. Merge approved changes to main branch

### Deployment Workflow

Deployments follow this automated process:

1. Changes to main branch trigger the deployment workflow
2. Build artifacts are created using Vite
3. Artifacts are uploaded to the S3 bucket
4. CloudFront cache is invalidated to reflect changes

```bash
# Manual deployment command
npm run deploy
```
