package pos.ambrosia.db

import org.jetbrains.exposed.v1.core.Column
import org.jetbrains.exposed.v1.core.ColumnType
import org.jetbrains.exposed.v1.core.dao.id.EntityID
import org.jetbrains.exposed.v1.core.dao.id.IdTable
import java.nio.ByteBuffer
import java.util.UUID

class SQLiteTextUUIDColumnType : ColumnType<UUID>() {
    override fun sqlType() = "TEXT"

    override fun valueFromDB(value: Any): UUID =
        when (value) {
            is UUID -> value
            is String -> UUID.fromString(value)
            is ByteArray -> ByteBuffer.wrap(value).let { UUID(it.long, it.long) }
            else -> error("Unexpected UUID value: type=${value::class.qualifiedName}, value=$value")
        }

    override fun notNullValueToDB(value: UUID): Any = value.toString()
}

open class SQLiteUUIDTable(
    name: String = "",
    columnName: String = "id",
) : IdTable<UUID>(name) {
    final override val id: Column<EntityID<UUID>> =
        registerColumn<UUID>(columnName, SQLiteTextUUIDColumnType()).entityId()
    final override val primaryKey = PrimaryKey(id)
}
