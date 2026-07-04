/**
 * switch-labels.ts — display labels for switch enum values.
 *
 * Pure lookup tables that turn generated protobuf enums into human strings for
 * the node detail page. Technical acronyms (DSCP, LACP, PERMIT, …) stay as-is;
 * they are not localized. Kept out of the component so they are easy to reuse.
 */

import {
	AclAction,
	AclRuleType,
	Dot1xPortState,
	ErpsRingState,
	LagMode,
	LinkState,
	MirrorDirection,
	PortMedia,
	QosSchedulerMode,
	QosTrustMode,
	SnmpAccess,
	SnmpSecurityLevel,
	StpPortRole,
	StpPortState,
} from "@kyanite/schema/schema/v1/switch_pb";

export const portMediaLabel: Record<PortMedia, string> = {
	[PortMedia.UNSPECIFIED]: "—",
	[PortMedia.RJ45_1G]: "1G RJ45",
	[PortMedia.SFP_1G]: "1G SFP",
	[PortMedia.SFP_PLUS_10G]: "10G SFP+",
	[PortMedia.CPU]: "CPU",
};

export const linkLabel: Record<LinkState, string> = {
	[LinkState.UNSPECIFIED]: "—",
	[LinkState.UP]: "up",
	[LinkState.DOWN]: "down",
};

export const stpRoleLabel: Record<StpPortRole, string> = {
	[StpPortRole.UNSPECIFIED]: "—",
	[StpPortRole.DISABLED]: "Disabled",
	[StpPortRole.ROOT]: "Root",
	[StpPortRole.DESIGNATED]: "Designated",
	[StpPortRole.ALTERNATE]: "Alternate",
	[StpPortRole.BACKUP]: "Backup",
};

export const stpStateLabel: Record<StpPortState, string> = {
	[StpPortState.UNSPECIFIED]: "—",
	[StpPortState.DISCARDING]: "Discarding",
	[StpPortState.LEARNING]: "Learning",
	[StpPortState.FORWARDING]: "Forwarding",
};

export const lagModeLabel: Record<LagMode, string> = {
	[LagMode.UNSPECIFIED]: "—",
	[LagMode.STATIC]: "Static",
	[LagMode.LACP_ACTIVE]: "LACP active",
	[LagMode.LACP_PASSIVE]: "LACP passive",
};

export const qosTrustLabel: Record<QosTrustMode, string> = {
	[QosTrustMode.UNSPECIFIED]: "—",
	[QosTrustMode.UNTRUSTED]: "Untrusted",
	[QosTrustMode.COS]: "CoS",
	[QosTrustMode.DSCP]: "DSCP",
};

export const qosSchedulerLabel: Record<QosSchedulerMode, string> = {
	[QosSchedulerMode.UNSPECIFIED]: "—",
	[QosSchedulerMode.STRICT_PRIORITY]: "Strict priority",
	[QosSchedulerMode.WEIGHTED_ROUND_ROBIN]: "Weighted round-robin",
};

export const mirrorDirectionLabel: Record<MirrorDirection, string> = {
	[MirrorDirection.UNSPECIFIED]: "—",
	[MirrorDirection.RX]: "Rx",
	[MirrorDirection.TX]: "Tx",
	[MirrorDirection.BOTH]: "Both",
};

export const aclActionLabel: Record<AclAction, string> = {
	[AclAction.UNSPECIFIED]: "—",
	[AclAction.PERMIT]: "Permit",
	[AclAction.DENY]: "Deny",
};

export const aclTypeLabel: Record<AclRuleType, string> = {
	[AclRuleType.UNSPECIFIED]: "—",
	[AclRuleType.MAC]: "MAC",
	[AclRuleType.IPV4]: "IPv4",
	[AclRuleType.IPV6]: "IPv6",
};

export const erpsStateLabel: Record<ErpsRingState, string> = {
	[ErpsRingState.UNSPECIFIED]: "—",
	[ErpsRingState.IDLE]: "Idle",
	[ErpsRingState.PROTECTION]: "Protection",
	[ErpsRingState.PENDING]: "Pending",
};

export const dot1xStateLabel: Record<Dot1xPortState, string> = {
	[Dot1xPortState.UNSPECIFIED]: "—",
	[Dot1xPortState.FORCE_UNAUTHORIZED]: "Force unauthorized",
	[Dot1xPortState.AUTO]: "Auto",
	[Dot1xPortState.FORCE_AUTHORIZED]: "Force authorized",
};

export const snmpAccessLabel: Record<SnmpAccess, string> = {
	[SnmpAccess.UNSPECIFIED]: "—",
	[SnmpAccess.READ_ONLY]: "Read-only",
	[SnmpAccess.READ_WRITE]: "Read-write",
};

export const snmpLevelLabel: Record<SnmpSecurityLevel, string> = {
	[SnmpSecurityLevel.UNSPECIFIED]: "—",
	[SnmpSecurityLevel.NO_AUTH_NO_PRIV]: "noAuthNoPriv",
	[SnmpSecurityLevel.AUTH_NO_PRIV]: "authNoPriv",
	[SnmpSecurityLevel.AUTH_PRIV]: "authPriv",
};
