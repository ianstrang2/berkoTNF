/**
 * Tenant-Aware Prisma Wrapper
 * 
 * This module provides a wrapper around Prisma that automatically includes
 * tenant_id in all queries, ensuring proper multi-tenant data isolation.
 * 
 * Based on SPEC_multi_tenancy.md - Prisma Query Wrapper Implementation
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TENANT_ID } from './tenantLocks';

/**
 * Tenant-aware Prisma wrapper class
 * Automatically scopes all queries to a specific tenant
 */
export class TenantAwarePrisma {
  constructor(
    private prismaInstance: PrismaClient,
    private tenantId: string
  ) {
    // Validate that tenant ID is provided
    if (!tenantId) {
      throw new Error('Tenant ID is required for tenant-aware Prisma operations');
    }
  }

  /**
   * Get the current tenant ID
   */
  get currentTenantId(): string {
    return this.tenantId;
  }

  /**
   * Get the underlying Prisma instance (for advanced operations)
   * Use with caution - this bypasses tenant scoping
   */
  get rawPrisma(): PrismaClient {
    return this.prismaInstance;
  }

  /**
   * Tenant-scoped players operations
   */
  get players() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.players.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.players.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.players.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.players.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.players.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.players.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.players.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.players.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.players.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped upcoming_matches operations
   */
  get upcoming_matches() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.upcoming_matches.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.upcoming_matches.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.upcoming_matches.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.upcoming_matches.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.upcoming_matches.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.upcoming_matches.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.upcoming_matches.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.upcoming_matches.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.upcoming_matches.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped match_player_pool operations
   */
  get match_player_pool() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.match_player_pool.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.match_player_pool.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.match_player_pool.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.match_player_pool.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.match_player_pool.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.match_player_pool.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.match_player_pool.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      upsert: (args: any) => this.prismaInstance.match_player_pool.upsert({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId },
        create: { ...args.create, tenant_id: this.tenantId },
        update: args.update
      }),
      
      count: (args: any = {}) => this.prismaInstance.match_player_pool.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped upcoming_match_players operations
   */
  get upcoming_match_players() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.upcoming_match_players.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.upcoming_match_players.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.upcoming_match_players.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.upcoming_match_players.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.upcoming_match_players.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.upcoming_match_players.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.upcoming_match_players.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.upcoming_match_players.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.upcoming_match_players.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped matches operations (historical data)
   */
  get matches() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.matches.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.matches.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.matches.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.matches.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.matches.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped team_slots operations
   */
  get team_slots() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.team_slots.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.team_slots.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.team_slots.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.team_slots.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.team_slots.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.team_slots.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.team_slots.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped app_config operations
   */
  get app_config() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.app_config.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.app_config.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.app_config.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.app_config.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.app_config.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      upsert: (args: any) => this.prismaInstance.app_config.upsert({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId },
        create: { ...args.create, tenant_id: this.tenantId },
        update: args.update
      })
    };
  }

  /**
   * Tenant-scoped team_balance_weights operations
   */
  get team_balance_weights() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.team_balance_weights.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.team_balance_weights.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.team_balance_weights.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.team_balance_weights.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.team_balance_weights.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.team_balance_weights.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.team_balance_weights.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.team_balance_weights.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.team_balance_weights.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped team_size_templates operations
   */
  get team_size_templates() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.team_size_templates.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.team_size_templates.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.team_size_templates.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.team_size_templates.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.team_size_templates.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.team_size_templates.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.team_size_templates.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.team_size_templates.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.team_size_templates.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped player_matches operations
   */
  get player_matches() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.player_matches.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.player_matches.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.player_matches.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.player_matches.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.player_matches.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.player_matches.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.player_matches.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.player_matches.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.player_matches.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_all_time_stats operations
   */
  get aggregated_all_time_stats() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_all_time_stats.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_all_time_stats.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_all_time_stats.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_all_time_stats.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_all_time_stats.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_all_time_stats.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_all_time_stats.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_all_time_stats.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_all_time_stats.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_personal_bests operations
   */
  get aggregated_personal_bests() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_personal_bests.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_personal_bests.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_personal_bests.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_personal_bests.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_personal_bests.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_personal_bests.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_personal_bests.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_personal_bests.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_personal_bests.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_player_profile_stats operations
   */
  get aggregated_player_profile_stats() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_player_profile_stats.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_player_profile_stats.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_player_profile_stats.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_player_profile_stats.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_player_profile_stats.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_player_profile_stats.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_player_profile_stats.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_player_profile_stats.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_player_profile_stats.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_player_teammate_stats operations
   */
  get aggregated_player_teammate_stats() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_player_teammate_stats.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_player_teammate_stats.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_player_teammate_stats.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_player_teammate_stats.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_player_teammate_stats.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_player_teammate_stats.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_player_teammate_stats.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_player_teammate_stats.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_player_teammate_stats.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_performance_ratings operations
   */
  get aggregated_performance_ratings() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_performance_ratings.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_performance_ratings.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_performance_ratings.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_performance_ratings.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_performance_ratings.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_performance_ratings.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_performance_ratings.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_performance_ratings.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_performance_ratings.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_match_report operations
   */
  get aggregated_match_report() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_match_report.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_match_report.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_match_report.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_match_report.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_match_report.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_match_report.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_match_report.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_match_report.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_match_report.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_records operations
   */
  get aggregated_records() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_records.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_records.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_records.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_records.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_records.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_records.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_records.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_records.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_records.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_half_season_stats operations
   */
  get aggregated_half_season_stats() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_half_season_stats.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_half_season_stats.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_half_season_stats.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_half_season_stats.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_half_season_stats.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_half_season_stats.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_half_season_stats.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_half_season_stats.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_half_season_stats.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_season_stats operations
   */
  get aggregated_season_stats() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_season_stats.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_season_stats.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_season_stats.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_season_stats.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_season_stats.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_season_stats.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_season_stats.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_season_stats.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_season_stats.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_recent_performance operations
   */
  get aggregated_recent_performance() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_recent_performance.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_recent_performance.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_recent_performance.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_recent_performance.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_recent_performance.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_recent_performance.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_recent_performance.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_recent_performance.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_recent_performance.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Tenant-scoped aggregated_season_race_data operations
   */
  get aggregated_season_race_data() {
    return {
      findMany: (args: any = {}) => this.prismaInstance.aggregated_season_race_data.findMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findUnique: (args: any) => this.prismaInstance.aggregated_season_race_data.findUnique({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      findFirst: (args: any = {}) => this.prismaInstance.aggregated_season_race_data.findFirst({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      create: (args: any) => this.prismaInstance.aggregated_season_race_data.create({
        ...args,
        data: { ...args.data, tenant_id: this.tenantId }
      }),
      
      update: (args: any) => this.prismaInstance.aggregated_season_race_data.update({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      updateMany: (args: any) => this.prismaInstance.aggregated_season_race_data.updateMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      delete: (args: any) => this.prismaInstance.aggregated_season_race_data.delete({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      deleteMany: (args: any = {}) => this.prismaInstance.aggregated_season_race_data.deleteMany({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      }),
      
      count: (args: any = {}) => this.prismaInstance.aggregated_season_race_data.count({
        ...args,
        where: { ...args.where, tenant_id: this.tenantId }
      })
    };
  }

  /**
   * Transaction support with tenant scoping
   * All operations within the transaction will be tenant-scoped
   */
  async $transaction<T>(
    callback: (tenantPrisma: TenantAwarePrisma) => Promise<T>
  ): Promise<T> {
    return this.prismaInstance.$transaction(async (tx) => {
      const tenantTx = new TenantAwarePrisma(tx as PrismaClient, this.tenantId);
      return callback(tenantTx);
    });
  }
}

/**
 * Create a tenant-aware Prisma instance with RLS context
 * This is the main entry point for multi-tenant database operations
 * 
 * @param tenantId - UUID of the tenant
 * @returns TenantAwarePrisma instance scoped to the tenant
 */
export async function createTenantPrisma(tenantId: string): Promise<TenantAwarePrisma> {
  // Set RLS context for this session
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
  
  return new TenantAwarePrisma(prisma, tenantId);
}

/**
 * Create a tenant-aware Prisma instance with the default tenant
 * For backward compatibility with existing code
 * 
 * @returns TenantAwarePrisma instance scoped to the default tenant
 */
export async function createDefaultTenantPrisma(): Promise<TenantAwarePrisma> {
  // Set RLS context for default tenant
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${DEFAULT_TENANT_ID}, false)`;
  
  return new TenantAwarePrisma(prisma, DEFAULT_TENANT_ID);
}

/**
 * Type for tenant-aware Prisma transaction callback
 */
export type TenantTransactionCallback<T> = (tenantPrisma: TenantAwarePrisma) => Promise<T>;

/**
 * Execute a transaction with tenant scoping
 * Convenience function for one-off transactions
 * 
 * @param tenantId - UUID of the tenant
 * @param callback - Transaction callback with tenant-scoped Prisma
 * @returns Promise with the result of the transaction
 */
export async function withTenantTransaction<T>(
  tenantId: string,
  callback: TenantTransactionCallback<T>
): Promise<T> {
  const tenantPrisma = await createTenantPrisma(tenantId);
  return tenantPrisma.$transaction(callback);
}
