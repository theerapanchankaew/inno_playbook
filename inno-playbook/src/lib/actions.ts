"use server";

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function saveOrganization(orgId: string | null, name: string, sector: string) {
  if (!name) return null;
  if (orgId) {
    return await prisma.organization.update({
      where: { id: orgId },
      data: { name, sector },
    });
  } else {
    return await prisma.organization.create({
      data: { name, sector },
    });
  }
}

export async function saveDeliverable(orgId: string, capId: string, fieldId: string, content: string) {
  if (!orgId) return null;
  
  return await prisma.deliverable.upsert({
    where: {
      orgId_fieldId: {
        orgId,
        fieldId,
      },
    },
    update: {
      content,
    },
    create: {
      orgId,
      capId,
      fieldId,
      content,
    },
  });
}

export async function getOrganizationData(orgId: string) {
  if (!orgId) return null;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      deliverables: true
    }
  });
  return org;
}

export async function getAllOrganizations() {
  return await prisma.organization.findMany({
    include: {
      deliverables: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}
