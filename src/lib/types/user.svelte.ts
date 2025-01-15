export interface IUser {
	id: string;
	display_name: string;
	username: string;
	email: string;
	s3_key?: string;
	online: boolean;
	last_active?: string;
}

export interface IUserUpdate {
	id: string;
	display_name: string;
	username: string;
	email: string;
	s3_key?: string;
}

export interface IUserUpdateImage {
	id: string;
	file: File;
}
