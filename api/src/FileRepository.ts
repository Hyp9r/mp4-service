import { FileMetadata } from "FileMetadata";
import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise";

class FileRepository {
  private connectionPool: mysql.Pool;

  constructor(connectionPool: mysql.Pool) {
    this.connectionPool = connectionPool;
  }

  public async create(fileMetadata: FileMetadata): Promise<Number> {
    const query = `INSERT INTO file_metadata(path, status) VALUES(?, ?)`;

    const [result] = await this.connectionPool.execute<ResultSetHeader>(query, [
      fileMetadata.path,
      fileMetadata.status,
    ]);

    return result.insertId;
  }

  public async update(fileMetadata: Partial<FileMetadata>): Promise<boolean> {
    const updates: string[] = [];
    const values: any[] = [];

    if (fileMetadata.processedFilePath !== "") {
      updates.push("processed_file_path = ?");
      values.push(fileMetadata.processedFilePath);
    }
    if (fileMetadata.error !== "") {
      updates.push("error = ?");
      values.push(fileMetadata.error);
    }
    if (fileMetadata.status !== undefined) {
      updates.push("status = ?");
      values.push(fileMetadata.status);
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(fileMetadata.id);

    const query = `UPDATE file_metadata SET ${updates.join(", ")} WHERE id = ?`;

    const [result] = await this.connectionPool.execute<ResultSetHeader>(
      query,
      values
    );

    return result.affectedRows > 0;
  }

  public async findOneByFilename(
    filename: string
  ): Promise<FileMetadata | null> {
    const query = `SELECT * FROM file_metadata WHERE original_filename=?`;
    const [rows] = await this.connectionPool.execute<RowDataPacket[]>(query, [
      filename,
    ]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as FileMetadata;
  }

  public async findOneById(id: Number): Promise<FileMetadata | null> {
    const query = `SELECT * FROM file_metadata WHERE id=?`;
    const [rows] = await this.connectionPool.execute<RowDataPacket[]>(query, [
      id,
    ]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as FileMetadata;
  }

  public async findAll(): Promise<FileMetadata[]> {
    const query = `SELECT * FROM file_metadata`;
    const [rows] = await this.connectionPool.execute<RowDataPacket[]>(query);

    return rows as FileMetadata[];
  }

  public async delete(id: Number): Promise<boolean> {
    const query = "DELETE FROM file_metadata WHERE id = ?";

    const [result] = await this.connectionPool.execute<ResultSetHeader>(query, [
      id,
    ]);

    return result.affectedRows > 0;
  }
}

export default FileRepository;
