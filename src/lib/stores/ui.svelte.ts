import { buildConversation } from '$lib/helpers.svelte';
import { channel_store } from '$lib/stores/channel.svelte';

class UIStore {
	static #instance: UIStore;
	private selected_channel_id = $state<string | null>(null);
	private selected_direct_message_conversation_id = $state<string | null>(null);
	private selected_workspace_id = $state<string | null>(null);
	private sidebar_collapsed = $state<boolean>(false);
	private workspace_settings_open = $state<boolean>(false);
	public workspace_landing_tab = $state<'general' | 'members' | 'files' | 'channels'>('general');
	private global_search_open = $state<boolean>(false);
	private global_search_tab = $state<'workspaces' | 'users'>('workspaces');
	private direct_message_user_search_open = $state<boolean>(false);
	private delete_channel_dialog_open = $state<boolean>(false);
	private delete_direct_message_dialog_open = $state<boolean>(false);
	private delete_workspace_dialog_open = $state<boolean>(false);
	private is_loading = $state<boolean>(false);
	private user_settings_open = $state<boolean>(false);
	private create_workspace_dialog_open = $state<boolean>(false);
	private create_channel_dialog_open = $state<boolean>(false);
	public leave_workspace_dialog_open = $state<boolean>(false);
	private user_search_open = $state<boolean>(false);
	private workspace_settings_tab = $state<'general' | 'members' | 'files' | 'channels'>('general');

	private constructor() { }

	public static getInstance(): UIStore {
		if (!UIStore.#instance) {
			UIStore.#instance = new UIStore();
		}
		return UIStore.#instance;
	}

	public getIsLoading(): boolean {
		return this.is_loading;
	}

	public setIsLoading(loading: boolean): void {
		this.is_loading = loading;
	}

	public getSidebarCollapsed(): boolean {
		return this.sidebar_collapsed;
	}

	public setSidebarCollapsed(collapsed: boolean): void {
		this.sidebar_collapsed = collapsed;
	}

	public toggleSidebar(): void {
		this.sidebar_collapsed = !this.sidebar_collapsed;
	}

	public getUserSearchOpen(): boolean {
		return this.global_search_open;
	}

	public setUserSearchOpen(open: boolean): void {
		this.global_search_open = open;
	}

	public onOpenUserSearch(): void {
		this.direct_message_user_search_open = true;
	}

	public toggleUserSearch(): void {
		this.user_search_open = !this.user_search_open;
	}

	public getUserSearchTab(): 'workspaces' | 'users' {
		return this.global_search_tab;
	}

	public setUserSearchTab(tab: 'workspaces' | 'users'): void {
		this.global_search_tab = tab;
	}

	public async selectChannel(channel_id: string): Promise<void> {
		const channel = channel_store.getChannel(channel_id);
		if (!channel) return;

		try {
			// First build the conversation
			await buildConversation(channel.conversation_id);
			// Then update the UI state
			this.selected_channel_id = channel_id;
			this.selected_direct_message_conversation_id = null;
		} catch (error) {
			console.error('Failed to load channel conversation:', error);
			throw error;
		}
	}

	public selectDirectMessageConversation(conversation_id: string): void {
		this.selected_direct_message_conversation_id = conversation_id;
		this.selected_channel_id = null;
		this.selected_workspace_id = null;
	}

	public selectWorkspace(workspace_id: string): void {
		this.selected_workspace_id = workspace_id;
		this.selected_channel_id = null;
		this.selected_direct_message_conversation_id = null;
		// Reset dialog states when selecting a new workspace
		this.leave_workspace_dialog_open = false;
		this.workspace_settings_open = false;
	}

	public unselectWorkspace(): void {
		this.selected_workspace_id = null;
		this.selected_channel_id = null;
	}

	public unselectDirectMessageConversation(): void {
		this.selected_direct_message_conversation_id = null;
	}

	public unselectChannel(): void {
		this.selected_channel_id = null;
	}

	public workspaceSelected() {
		return this.selected_workspace_id;
	}

	public channelSelected() {
		return this.selected_channel_id;
	}
	public directMessageConversationSelected() {
		return this.selected_direct_message_conversation_id;
	}

	public globalSearchOpen(): boolean {
		return this.global_search_open;
	}

	public toggleGlobalSearch(): void {
		this.global_search_open = !this.global_search_open;
	}

	public setGlobalSearchTab(tab: 'workspaces' | 'users'): void {
		this.global_search_tab = tab;
	}
	public toggleUserSettings(): void {
		this.user_settings_open = !this.user_settings_open;
	}

	public getUserSettingsOpen(): boolean {
		return this.user_settings_open;
	}
	public toggleCreateWorkspaceDialog(): void {
		this.create_workspace_dialog_open = !this.create_workspace_dialog_open;
	}
	public toggleCreateChannelDialog(): void {
		this.create_channel_dialog_open = !this.create_channel_dialog_open;
	}

	public getCreateWorkspaceDialogOpen(): boolean {
		return this.create_workspace_dialog_open;
	}
	public getCreateChannelDialogOpen(): boolean {
		return this.create_channel_dialog_open;
	}

	public toggleWorkspaceSettings(): void {
		this.workspace_settings_open = !this.workspace_settings_open;
	}

	public getWorkspaceSettingsOpen(): boolean {
		return this.workspace_settings_open;
	}

	public getWorkspaceSettingsTab(): 'general' | 'members' | 'files' | 'channels' {
		return this.workspace_settings_tab;
	}

	public setWorkspaceSettingsTab(tab: 'general' | 'members' | 'files' | 'channels'): void {
		this.workspace_settings_tab = tab;
	}
	public toggleLeaveWorkspaceDialog(): void {
		this.leave_workspace_dialog_open = !this.leave_workspace_dialog_open;
	}
	public getLeaveWorkspaceDialogOpen(): boolean {
		return this.leave_workspace_dialog_open;
	}
}

export const ui_store = UIStore.getInstance();
