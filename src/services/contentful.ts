import { createClient } from 'contentful';
import { createClient as createManagementClient } from 'contentful-management';
import type { Environment } from 'contentful-management/dist/typings/export-types';

// Todoアイテムの型定義（アプリケーション用）
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

// 読み取り専用クライアント
const contentfulClient = createClient({
  space: import.meta.env.VITE_CONTENTFUL_SPACE_ID as string,
  accessToken: import.meta.env.VITE_CONTENTFUL_DELIVERY_TOKEN as string,
});

// 管理クライアント（作成・更新・削除用）
const contentfulManagementClient = createManagementClient({
  accessToken: import.meta.env.VITE_CONTENTFUL_MANAGEMENT_TOKEN as string,
});

// 環境の取得（キャッシュ）
let cachedEnvironment: Environment | null = null;
const getEnvironment = async (): Promise<Environment> => {
  if (cachedEnvironment) return cachedEnvironment;

  const space = await contentfulManagementClient.getSpace(
    import.meta.env.VITE_CONTENTFUL_SPACE_ID as string
  );
  cachedEnvironment = await space.getEnvironment('master');
  return cachedEnvironment;
};

// タスク操作API
export const taskApi = {
  // すべてのタスクを取得
  getAllTasks: async (): Promise<TodoItem[]> => {
    // @ts-ignore: Contentfulの型エラーを回避
    const response = await contentfulClient.getEntries({
      content_type: 'todo',
      // @ts-ignore: order型エラーを回避
      order: '-fields.createdAt',
    });

    return response.items.map((item: any): TodoItem => {
      return {
        id: item.sys.id,
        text: item.fields.title,
        completed: !!item.fields.completed,
        createdAt: item.fields.createdAt || new Date().toISOString()
      };
    });
  },

  // 新しいタスクを作成
  createTask: async (text: string): Promise<TodoItem> => {
    try {
      const environment = await getEnvironment();

      const entry = await environment.createEntry('todo', {
        fields: {
          title: { 'en-US': text },
          completed: { 'en-US': false },
          createdAt: { 'en-US': new Date().toISOString() }
        }
      });

      await entry.publish();

      return {
        id: entry.sys.id,
        text,
        completed: false,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  // タスクの完了状態を切り替え
  toggleTaskCompletion: async (id: string, currentStatus: boolean): Promise<TodoItem> => {
    try {
      const environment = await getEnvironment();
      const entry = await environment.getEntry(id);

      // @ts-ignore: Contentfulの型エラーを回避
      entry.fields.completed = { 'en-US': !currentStatus };

      const updatedEntry = await entry.update();
      await updatedEntry.publish();

      // @ts-ignore: Contentfulの型エラーを回避
      const title = updatedEntry.fields.title['en-US'] || '';
      // @ts-ignore: Contentfulの型エラーを回避
      const completed = !!updatedEntry.fields.completed['en-US'];
      // @ts-ignore: Contentfulの型エラーを回避
      const createdAt = updatedEntry.fields.createdAt['en-US'] || new Date().toISOString();

      return {
        id: updatedEntry.sys.id,
        text: title,
        completed: completed,
        createdAt: createdAt
      };
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  },

  // タスクを削除
  deleteTask: async (id: string): Promise<{ success: boolean, id: string }> => {
    try {
      const environment = await getEnvironment();
      const entry = await environment.getEntry(id);

      // 公開を解除してから削除
      if (entry.sys.publishedVersion && entry.sys.publishedVersion > 0) {
        await entry.unpublish();
      }
      await entry.delete();

      return { success: true, id };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }
};

export default taskApi;
