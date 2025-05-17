<div className="space-y-4 services-container">
  <Card className="bg-white/80 backdrop-blur-sm">
    <CardHeader className="p-2 sm:p-4 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-t-lg">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-7 w-7"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Button>
        <CardTitle className="text-base sm:text-lg text-gray-800">Services Management</CardTitle>
      </div>
    </CardHeader>
    <div className="p-2 sm:p-4 md:p-6">
      {/* Add usage limit alert */}
      {shouldShowAlert('services') && !dismissedAlerts.has('services') && (
        <UsageLimitAlert
          featureId="services"
          tenantId={tenantId}
          currentUsage={getLimit('services')?.current || 0}
          limit={getLimit('services')?.limit || 0}
          type={getLimit('services')?.type || 'warning'}
          onDismiss={() => setDismissedAlerts(prev => new Set([...prev, 'services']))}
        />
      )}

      <div className="w-full mx-auto bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden">
        <div className="p-2 sm:p-4 border-b flex flex-col sm:flex-row gap-2 sm:gap-4 bg-gradient-to-r from-gray-50 to-blue-50/50">
          <Select
            value={filterType}
            onValueChange={(value) => {
              setFilterType(value as 'name' | 'category' | 'status');
              setColumnFilters(
                filterValue
                  ? [
                      {
                        id: value === 'name' ? 'name' : value === 'category' ? 'category' : 'status',
                        value: filterValue,
                      },
                    ]
                  : []
              );
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px] text-sm border-gray-300 focus:border-blue-500 h-8 bg-white/80 backdrop-blur-sm">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-sm">
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="text"
            placeholder={`Filter by ${filterType} (e.g., ${
              filterType === 'name' ? 'Dental Cleaning' : filterType === 'category' ? 'Dental' : 'Active'
            })`}
            value={filterValue}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="w-full sm:max-w-xs text-sm border-gray-300 focus:border-blue-500 p-2 rounded border h-8 bg-white/80 backdrop-blur-sm"
          />
        </div>

        <Table className="w-full border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gradient-to-r from-blue-500/10 to-teal-500/10">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-medium text-gray-700 p-1 sm:p-2"
                    style={{ width: header.column.getSize() === 150 ? 'auto' : header.column.getSize() }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  className="hover:bg-blue-50/50 border-b border-gray-100 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="text-xs sm:text-sm text-gray-700 p-1 sm:p-2 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-gray-500 py-4">
                  No services found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  </Card>
</div> 