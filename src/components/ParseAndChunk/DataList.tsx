import React from "react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination } from "./pagination";
import { Badge } from "@/components/ui/badge";

// 定义列的属性
type Column = {
  key: string;
  label: string;
  tdClassName?: string;
  render?: (value: any, row: any) => React.ReactNode;
};

type DataListProps = {
  data: any[];
};

export default function DataList({ data }: DataListProps) {
  const { page, totalPages, pageData, next, prev, goTo } = usePagination(data, 10);

  // 状态颜色映射
  const getStatusColor = (status: string) => {
    switch (status) {
      case '处理完成':
      case '解析成功':
      case '分块成功':
        return 'bg-green-100 text-green-800';
      case '处理中':
      case '解析中':
      case '分块中':
        return 'bg-yellow-100 text-yellow-800';
      case '处理失败':
      case '解析失败':
      case '分块失败':
        return 'bg-red-100 text-red-800';
      case '已解压':
      case '等待处理':
        return 'bg-blue-100 text-blue-800';
      case '未开始':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns: Column[] = [
    { key: "fileName", label: "文件名" },
    { key: "format", label: "格式" },
    { key: "size", label: "大小" },
    { 
      key: "status", 
      label: "状态",
      render: (value) => <Badge variant="outline" className={getStatusColor(value)}>{value}</Badge>
    },
    { 
      key: "stage", 
      label: "阶段",
      render: (value) => <span className="text-sm">{value}</span>
    },
    { 
      key: "parsingStatus", 
      label: "解析状态",
      render: (value) => <Badge variant="outline" className={getStatusColor(value)}>{value}</Badge>
    },
    { 
      key: "chunkingStatus", 
      label: "分块状态",
      render: (value) => <Badge variant="outline" className={getStatusColor(value)}>{value}</Badge>
    },
  ];

  return (
    <div className="space-y-4">
      <div className="border rounded p-4 space-y-2">
        <table className="min-w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left border-b bg-gray-50">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-sm">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页组件保持不变 */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={prev} />
          </PaginationItem>
          {[...Array(totalPages)].map((_, i) => {
            const pageNum = i + 1;
            if (totalPages > 7) {
              if (pageNum === 1 || pageNum === totalPages) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink onClick={() => goTo(pageNum)} isActive={page === pageNum}>
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              if (pageNum === page - 1 || pageNum === page || pageNum === page + 1) {
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink onClick={() => goTo(pageNum)} isActive={page === pageNum}>
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              if (pageNum === page - 2 || pageNum === page + 2) {
                return (
                  <PaginationItem key={`ellipsis-${pageNum}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              return null;
            }
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink onClick={() => goTo(pageNum)} isActive={page === pageNum}>
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext onClick={next} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}